#!/usr/bin/env python3
import csv
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = Path("/Users/jinglemisk/Desktop/vanity/sales/stats/all_months_salesmen.csv")
OUTPUT_DIR = ROOT / "outputs" / "019e8f47-e991-7992-92e2-68cb152ad05e"
OUTPUT_XLSX = OUTPUT_DIR / "sales_stats_four_months.xlsx"

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS_DRAWING = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_C = "http://schemas.openxmlformats.org/drawingml/2006/chart"


def col_letter(number):
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def cell_ref(row, col):
    return f"{col_letter(col)}{row}"


def q(value):
    return quoteattr(str(value))


def text(value):
    return escape(str(value), {"'": "&apos;", '"': "&quot;"})


def sheet_ref(sheet_name, cell_range):
    return f"'{sheet_name.replace(chr(39), chr(39) + chr(39))}'!{cell_range}"


def n(value):
    if isinstance(value, int):
        return str(value)
    return f"{float(value):.10g}"


def inline_cell(ref, value, style=None, formula=None):
    s = f' s="{style}"' if style is not None else ""
    if formula:
        return f'<c r="{ref}" t="str"{s}><f>{text(formula)}</f><v>{text(value)}</v></c>'
    return f'<c r="{ref}" t="inlineStr"{s}><is><t>{text(value)}</t></is></c>'


def num_cell(ref, value, style=None, formula=None):
    s = f' s="{style}"' if style is not None else ""
    f = f"<f>{text(formula)}</f>" if formula else ""
    return f'<c r="{ref}"{s}>{f}<v>{n(value)}</v></c>'


def row_xml(row_number, cells, height=None):
    ht = f' ht="{height}" customHeight="1"' if height else ""
    return f'<row r="{row_number}"{ht}>{"".join(cells)}</row>'


def load_rows():
    with SOURCE_CSV.open(newline="", encoding="utf-8-sig") as handle:
        rows = []
        for row in csv.DictReader(handle):
            rows.append(
                {
                    "month": row["month"],
                    "month_number": int(row["month_number"]),
                    "days": int(row["days_in_table"]),
                    "salesman": row["salesman"],
                    "total_leads": int(row["total_leads"]),
                    "total_kapora": float(row["total_kapora"]),
                    "daily_avg_leads": float(row["daily_avg_leads"]),
                    "conversion_rate": float(row["conversion_rate_pct"]) / 100,
                    "source_rows": int(row["source_rows"]),
                }
            )
    by_month = defaultdict(list)
    for row in rows:
        by_month[row["month"]].append(row)
    months = sorted(by_month, key=lambda month: by_month[month][0]["month_number"])
    return [(month, by_month[month]) for month in months]


def build_content_types(sheet_count):
    overrides = [
        ("/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"),
        ("/xl/styles.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"),
        ("/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"),
        ("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"),
    ]
    for idx in range(1, sheet_count + 1):
        overrides.extend(
            [
                (f"/xl/worksheets/sheet{idx}.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"),
                (f"/xl/drawings/drawing{idx}.xml", "application/vnd.openxmlformats-officedocument.drawing+xml"),
                (f"/xl/charts/chart{idx}.xml", "application/vnd.openxmlformats-officedocument.drawingml.chart+xml"),
            ]
        )
    parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
    ]
    parts += [f'<Override PartName="{part}" ContentType="{ctype}"/>' for part, ctype in overrides]
    parts.append("</Types>")
    return "".join(parts)


def build_root_rels():
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{NS_PACKAGE_REL}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def build_workbook(months):
    sheets = []
    for idx, (month, _) in enumerate(months, start=1):
        sheets.append(f'<sheet name={q(month)} sheetId="{idx}" r:id="rId{idx}"/>')
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="{NS_MAIN}" xmlns:r="{NS_REL}">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="23426"/>
  <workbookPr defaultThemeVersion="166925"/>
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="17600"/></bookViews>
  <sheets>{''.join(sheets)}</sheets>
  <calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>'''


def build_workbook_rels(sheet_count):
    relationships = []
    for idx in range(1, sheet_count + 1):
        relationships.append(
            f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{idx}.xml"/>'
        )
    relationships.append(
        f'<Relationship Id="rId{sheet_count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{NS_PACKAGE_REL}">{''.join(relationships)}</Relationships>'''


def build_core_props():
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Sales Stats Four Month Workbook</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''


def build_app_props(months):
    titles = "".join(f"<vt:lpstr>{text(month)}</vt:lpstr>" for month, _ in months)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>{len(months)}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts><vt:vector size="{len(months)}" baseType="lpstr">{titles}</vt:vector></TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>'''


def build_styles():
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="{NS_MAIN}">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="#,##0.00"/>
    <numFmt numFmtId="166" formatCode="0.00%"/>
  </numFmts>
  <fonts count="5">
    <font><sz val="11"/><color theme="1"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF17201B"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF245F84"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF17201B"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF117A56"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7F5EF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE3F4EC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE5F1F7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF0CF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD9D5C9"/></left>
      <right style="thin"><color rgb="FFD9D5C9"/></right>
      <top style="thin"><color rgb="FFD9D5C9"/></top>
      <bottom style="thin"><color rgb="FFD9D5C9"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="3" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="3" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>'''


def build_sheet(month, rows, drawing_id):
    sorted_rows = sorted(rows, key=lambda item: (-item["total_kapora"], -item["total_leads"], item["salesman"]))
    data_start = 8
    data_end = data_start + len(sorted_rows) - 1
    total_leads = sum(row["total_leads"] for row in sorted_rows)
    total_kapora = sum(row["total_kapora"] for row in sorted_rows)
    days = sorted_rows[0]["days"]
    conversion_rate = total_kapora / total_leads if total_leads else 0
    source_rows = sum(row["source_rows"] for row in sorted_rows)
    chart_rows = sorted_rows[:10]
    parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        f'<worksheet xmlns="{NS_MAIN}" xmlns:r="{NS_REL}">',
        f'<dimension ref="A1:S{max(data_end, 18)}"/>',
        '<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A8" sqref="A8"/></sheetView></sheetViews>',
        '<sheetFormatPr defaultRowHeight="18"/>',
        '<cols>',
        '<col min="1" max="1" width="8" customWidth="1"/>',
        '<col min="2" max="2" width="28" customWidth="1"/>',
        '<col min="3" max="4" width="14" customWidth="1"/>',
        '<col min="5" max="6" width="16" customWidth="1"/>',
        '<col min="7" max="7" width="12" customWidth="1"/>',
        '<col min="8" max="8" width="3" customWidth="1"/>',
        '<col min="9" max="9" width="26" customWidth="1"/>',
        '<col min="10" max="10" width="12" customWidth="1"/>',
        '<col min="11" max="19" width="14" customWidth="1"/>',
        '</cols>',
        '<sheetData>',
    ]

    parts.append(row_xml(1, [inline_cell("A1", f"Sales Stats - {month}", 1)], height=26))
    parts.append(row_xml(3, [
        inline_cell("A3", "Total Leads", 3),
        num_cell("B3", total_leads, 8, f"SUM(C{data_start}:C{data_end})"),
        inline_cell("C3", "Total Kapora", 3),
        num_cell("D3", total_kapora, 9, f"SUM(D{data_start}:D{data_end})"),
        inline_cell("E3", "Conversion Rate", 3),
        num_cell("F3", conversion_rate, 6, "IF(B3=0,0,D3/B3)"),
    ], height=21))
    parts.append(row_xml(4, [
        inline_cell("A4", "Days in Table", 3),
        num_cell("B4", days, 4),
        inline_cell("C4", "Salespeople", 3),
        num_cell("D4", len(sorted_rows), 4, f"COUNTA(B{data_start}:B{data_end})"),
        inline_cell("E4", "Source Rows", 3),
        num_cell("F4", source_rows, 4, f"SUM(G{data_start}:G{data_end})"),
    ], height=21))
    parts.append(row_xml(7, [
        inline_cell("A7", "Rank", 2),
        inline_cell("B7", "Salesman", 2),
        inline_cell("C7", "Total Leads", 2),
        inline_cell("D7", "Total Kapora", 2),
        inline_cell("E7", "Daily Avg Leads", 2),
        inline_cell("F7", "Conversion Rate", 2),
        inline_cell("G7", "Source Rows", 2),
        inline_cell("I7", "Top 10 Kapora", 10),
        inline_cell("J7", "Kapora", 10),
    ], height=22))

    for offset, source in enumerate(sorted_rows):
        row_number = data_start + offset
        rank_style = 11 if offset < 3 else 7
        cells = [
            num_cell(cell_ref(row_number, 1), offset + 1, 4),
            inline_cell(cell_ref(row_number, 2), source["salesman"], rank_style),
            num_cell(cell_ref(row_number, 3), source["total_leads"], 4),
            num_cell(cell_ref(row_number, 4), source["total_kapora"], 5),
            num_cell(cell_ref(row_number, 5), source["total_leads"] / days, 5, f"C{row_number}/$B$4"),
            num_cell(cell_ref(row_number, 6), source["total_kapora"] / source["total_leads"] if source["total_leads"] else 0, 6, f"IF(C{row_number}=0,0,D{row_number}/C{row_number})"),
            num_cell(cell_ref(row_number, 7), source["source_rows"], 4),
        ]
        if offset < len(chart_rows):
            cells.extend([
                inline_cell(cell_ref(row_number, 9), source["salesman"], 7, f"B{row_number}"),
                num_cell(cell_ref(row_number, 10), source["total_kapora"], 5, f"D{row_number}"),
            ])
        parts.append(row_xml(row_number, cells))

    parts.extend([
        '</sheetData>',
        '<mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells>',
        f'<autoFilter ref="A7:G{data_end}"/>',
        f'<drawing r:id="rId{drawing_id}"/>',
        '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>',
        '</worksheet>',
    ])
    return "".join(parts), chart_rows


def chart_text_points(values):
    points = [f'<c:pt idx="{idx}"><c:v>{text(value)}</c:v></c:pt>' for idx, value in enumerate(values)]
    return f'<c:ptCount val="{len(values)}"/>{"".join(points)}'


def chart_num_points(values):
    points = [f'<c:pt idx="{idx}"><c:v>{n(value)}</c:v></c:pt>' for idx, value in enumerate(values)]
    return f'<c:formatCode>General</c:formatCode><c:ptCount val="{len(values)}"/>{"".join(points)}'


def build_chart(month, chart_rows, chart_id):
    names = [row["salesman"] for row in chart_rows]
    values = [row["total_kapora"] for row in chart_rows]
    title = f"Top 10 Kapora - {month}"
    cat_range = sheet_ref(month, "$I$8:$I$17")
    val_range = sheet_ref(month, "$J$8:$J$17")
    series_name = sheet_ref(month, "$J$7")
    cat_axis = 50000000 + chart_id * 10
    val_axis = cat_axis + 1
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="{NS_C}" xmlns:a="{NS_A}" xmlns:r="{NS_REL}">
  <c:date1904 val="0"/>
  <c:lang val="en-US"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400" b="1"/><a:t>{text(title)}</a:t></a:r></a:p></c:rich></c:tx>
      <c:layout/><c:overlay val="0"/>
    </c:title>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx><c:strRef><c:f>{text(series_name)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Kapora</c:v></c:pt></c:strCache></c:strRef></c:tx>
          <c:spPr><a:solidFill><a:srgbClr val="117A56"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>
          <c:invertIfNegative val="0"/>
          <c:cat><c:strRef><c:f>{text(cat_range)}</c:f><c:strCache>{chart_text_points(names)}</c:strCache></c:strRef></c:cat>
          <c:val><c:numRef><c:f>{text(val_range)}</c:f><c:numCache>{chart_num_points(values)}</c:numCache></c:numRef></c:val>
        </c:ser>
        <c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
        <c:gapWidth val="65"/>
        <c:axId val="{cat_axis}"/>
        <c:axId val="{val_axis}"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="{cat_axis}"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:axPos val="l"/>
        <c:majorTickMark val="none"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln><a:solidFill><a:srgbClr val="B7B0A1"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="{val_axis}"/>
        <c:crosses val="autoZero"/>
        <c:auto val="1"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="{val_axis}"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:axPos val="b"/>
        <c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="D9D5C9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>
        <c:numFmt formatCode="#,##0.00" sourceLinked="0"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln><a:solidFill><a:srgbClr val="B7B0A1"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="{cat_axis}"/>
        <c:crosses val="autoZero"/>
        <c:crossBetween val="between"/>
      </c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
    <c:showDLblsOverMax val="0"/>
  </c:chart>
  <c:printSettings>
    <c:headerFooter/>
    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
    <c:pageSetup/>
  </c:printSettings>
</c:chartSpace>'''


def build_drawing(chart_id):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="{NS_DRAWING}" xmlns:a="{NS_A}">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>11</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>19</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>19</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr><xdr:cNvPr id="{chart_id + 1}" name="Kapora Chart {chart_id}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="{NS_C}"><c:chart xmlns:c="{NS_C}" xmlns:r="{NS_REL}" r:id="rId1"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>'''


def build_sheet_rels(drawing_id):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{NS_PACKAGE_REL}">
  <Relationship Id="rId{drawing_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing{drawing_id}.xml"/>
</Relationships>'''


def build_drawing_rels(chart_id):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{NS_PACKAGE_REL}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart{chart_id}.xml"/>
</Relationships>'''


def write_workbook():
    months = load_rows()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet_payloads = []
    chart_payloads = []
    for idx, (month, rows) in enumerate(months, start=1):
        sheet_xml, chart_rows = build_sheet(month, rows, idx)
        sheet_payloads.append(sheet_xml)
        chart_payloads.append(build_chart(month, chart_rows, idx))

    with zipfile.ZipFile(OUTPUT_XLSX, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", build_content_types(len(months)))
        archive.writestr("_rels/.rels", build_root_rels())
        archive.writestr("docProps/core.xml", build_core_props())
        archive.writestr("docProps/app.xml", build_app_props(months))
        archive.writestr("xl/workbook.xml", build_workbook(months))
        archive.writestr("xl/_rels/workbook.xml.rels", build_workbook_rels(len(months)))
        archive.writestr("xl/styles.xml", build_styles())
        for idx, sheet_xml in enumerate(sheet_payloads, start=1):
            archive.writestr(f"xl/worksheets/sheet{idx}.xml", sheet_xml)
            archive.writestr(f"xl/worksheets/_rels/sheet{idx}.xml.rels", build_sheet_rels(idx))
            archive.writestr(f"xl/drawings/drawing{idx}.xml", build_drawing(idx))
            archive.writestr(f"xl/drawings/_rels/drawing{idx}.xml.rels", build_drawing_rels(idx))
            archive.writestr(f"xl/charts/chart{idx}.xml", chart_payloads[idx - 1])
    return OUTPUT_XLSX


if __name__ == "__main__":
    print(write_workbook())
