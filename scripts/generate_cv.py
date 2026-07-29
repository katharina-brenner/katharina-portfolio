from pathlib import Path

from reportlab.lib.colors import HexColor, black
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "katharina-julia-brenner-cv.pdf"

GRAY = HexColor("#444444")
LIGHT_GRAY = HexColor("#777777")
RULE = HexColor("#A8A8A8")


def draw_paragraph(c, text, style, x, y_top, width):
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, 1000)
    paragraph.drawOn(c, x, y_top - height)
    return y_top - height


def section_heading(c, title, x, y, width):
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawString(x, y, title.upper())
    c.setStrokeColor(black)
    c.setLineWidth(0.7)
    c.line(x, y - 4, x + width, y - 4)
    return y - 16


def role_entry(c, title, organization, date, bullets, x, y, width, body_style):
    c.setFillColor(black)
    c.setFont("Times-Bold", 10)
    c.drawString(x, y, title)
    c.setFont("Helvetica", 7.8)
    c.drawRightString(x + width, y, date)
    c.setFillColor(GRAY)
    c.setFont("Times-Italic", 8.8)
    c.drawString(x, y - 12, organization)
    y -= 23
    for bullet in bullets:
        y = draw_paragraph(c, f"- {bullet}", body_style, x + 9, y, width - 9) - 2
    return y - 7


def project_entry(c, title, descriptor, date, text, x, y, width, body_style):
    c.setFillColor(black)
    c.setFont("Times-Bold", 9.5)
    c.drawString(x, y, title)
    c.setFont("Helvetica", 7.6)
    c.drawRightString(x + width, y, date)
    c.setFillColor(LIGHT_GRAY)
    c.setFont("Times-Italic", 8.3)
    c.drawString(x, y - 11, descriptor)
    y = draw_paragraph(c, text, body_style, x, y - 18, width)
    return y - 8


def publication_entry(c, year, title, journal, x, y, width, publication_style):
    c.setFillColor(black)
    c.setFont("Helvetica", 7.6)
    c.drawRightString(x + width, y, year)
    y = draw_paragraph(
        c,
        f"<b>{title}</b>. <i>{journal}</i>.",
        publication_style,
        x,
        y + 1,
        width - 42,
    )
    return y - 6


def create_cv():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    width, height = A4
    c.setTitle("Katharina Julia Brenner - Curriculum Vitae")
    c.setAuthor("Katharina Julia Brenner")
    c.setSubject("Industrial Process Modeling and Bioengineering")

    margin = 43
    content_width = width - 2 * margin
    y = height - 43

    body_style = ParagraphStyle(
        "Body",
        fontName="Times-Roman",
        fontSize=8.4,
        leading=11.2,
        textColor=GRAY,
        alignment=TA_LEFT,
    )
    summary_style = ParagraphStyle(
        "Summary",
        fontName="Times-Roman",
        fontSize=9.2,
        leading=12.4,
        textColor=GRAY,
        alignment=TA_LEFT,
    )
    publication_style = ParagraphStyle(
        "Publication",
        fontName="Times-Roman",
        fontSize=8.1,
        leading=10.6,
        textColor=GRAY,
        alignment=TA_LEFT,
    )
    compact_style = ParagraphStyle(
        "Compact",
        fontName="Times-Roman",
        fontSize=8.1,
        leading=10.6,
        textColor=GRAY,
        alignment=TA_LEFT,
    )

    c.setFillColor(black)
    c.setFont("Times-Bold", 19)
    c.drawCentredString(width / 2, y, "KATHARINA JULIA BRENNER")
    y -= 17
    c.setFont("Helvetica", 8.2)
    c.drawCentredString(
        width / 2,
        y,
        "INDUSTRIAL PROCESS MODELER  |  BIOENGINEER  |  PHD CANDIDATE",
    )
    y -= 14
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7.3)
    c.drawCentredString(
        width / 2,
        y,
        "Munich, Germany  |  katharina.brenner@tum.de  |  katharinabrenner.com",
    )
    y -= 11
    c.drawCentredString(
        width / 2,
        y,
        "linkedin.com/in/katharina-julia-brenner  |  github.com/katharina-brenner",
    )
    y -= 11
    c.setStrokeColor(black)
    c.setLineWidth(1)
    c.line(margin, y, width - margin, y)
    y -= 18

    y = section_heading(c, "Professional Summary", margin, y, content_width)
    y = draw_paragraph(
        c,
        "Industrial process modeler and bioengineer building quantitative, plant-wide models for complex manufacturing systems. Work spans bioprocess scale-up, mass and energy balances, digital twins, techno-economic analysis, life-cycle assessment, uncertainty, and data-driven decision support.",
        summary_style,
        margin,
        y,
        content_width,
    ) - 14

    y = section_heading(c, "Professional and Academic Experience", margin, y, content_width)
    y = role_entry(
        c,
        "PhD Candidate and Scientific Staff",
        "Technical University of Munich - Cellular Agriculture",
        "2023 - Present",
        [
            "Develop quantitative models of industrial biomanufacturing processes from unit operation to facility level.",
            "Connect process design, scale-up, utilities, TEA, LCA, digital twins, and engineering decision support.",
        ],
        margin,
        y,
        content_width,
        body_style,
    )
    y = role_entry(
        c,
        "Founder",
        "Future Foods at TUM",
        "2024 - Present",
        [
            "Build an interdisciplinary community across sustainable food, advanced technologies, research, and entrepreneurship.",
        ],
        margin,
        y,
        content_width,
        body_style,
    )
    y = role_entry(
        c,
        "Class of Fall 2017",
        "Center for Digital Technology and Management (CDTM)",
        "2017",
        [
            "Completed interdisciplinary innovation and technology-management work alongside a foundation in business administration.",
        ],
        margin,
        y,
        content_width,
        body_style,
    )

    y = section_heading(c, "Selected Technical Work", margin, y - 4, content_width)
    y = project_entry(
        c,
        "Cultivated Meat Process Model",
        "Open research platform",
        "2026",
        "Plant-wide model from media preparation through packaging, with complete mass and energy balances, utilities, scenarios, and an interactive public interface.",
        margin,
        y,
        content_width,
        body_style,
    )
    y = project_entry(
        c,
        "BioTA - Bioreactor Technical Analysis",
        "Open modeling workflow",
        "Open source",
        "Workflow for bioreactor yield prediction and operating-point optimization, designed toward richer time-dependent models and future CFD coupling.",
        margin,
        y,
        content_width,
        body_style,
    )

    y = section_heading(c, "Core Competencies", margin, y - 4, content_width)
    y = draw_paragraph(
        c,
        "<b>Process systems:</b> plant-wide simulation, mass and energy balances, facility architecture, utilities, bottleneck analysis  |  "
        "<b>Scale-up:</b> bioreactors, process design, scenarios, TEA, LCA  |  "
        "<b>Digital engineering:</b> Python, data science, AI, digital twins, decision tools  |  "
        "<b>Analytical foundation:</b> mathematics, statistics, uncertainty, optimization",
        compact_style,
        margin,
        y,
        content_width,
    ) - 14

    y = section_heading(c, "Selected Publications", margin, y - 4, content_width)
    y = publication_entry(
        c,
        "2026",
        "Decoding cultured meat manufacturing: a full process model to identify scale-up bottlenecks",
        "Frontiers in Nutrition",
        margin,
        y,
        content_width,
        publication_style,
    )
    y = publication_entry(
        c,
        "2026",
        "Waste stream valorization in cultured meat manufacturing: pathways toward circularity and sustainability",
        "Applied Food Research",
        margin,
        y,
        content_width,
        publication_style,
    )
    y = publication_entry(
        c,
        "2025",
        "Bioreactor parameters and systems for cultured meat production",
        "Future Foods",
        margin,
        y,
        content_width,
        publication_style,
    )
    y = publication_entry(
        c,
        "2025",
        "Technology and processes for cultivated meat",
        "Ernahrungs Umschau",
        margin,
        y,
        content_width,
        publication_style,
    )

    y = section_heading(c, "Affiliations and Recognition", margin, y - 4, content_width)
    y = draw_paragraph(
        c,
        "<b>Selected stations:</b> Cambridge, TUM, CDTM, Bayerische EliteAkademie, LMU, Stanford, KAIST, TUM Venture Labs<br/>"
        "<b>Recognition:</b> Deutschlandstipendium (2022); Lothar-und-Sigrid-Rohde-Stiftung (2021); Bayerische EliteAkademie, Class of 2017<br/>"
        "<b>Languages:</b> German, English",
        compact_style,
        margin,
        y,
        content_width,
    )

    c.setStrokeColor(RULE)
    c.setLineWidth(0.45)
    c.line(margin, 31, width - margin, 31)
    c.setFillColor(LIGHT_GRAY)
    c.setFont("Helvetica", 6.7)
    c.drawString(margin, 20, "Katharina Julia Brenner")
    c.drawRightString(width - margin, 20, "Curriculum Vitae  |  2026")

    c.showPage()
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    create_cv()
