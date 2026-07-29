from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "katharina-julia-brenner-cv.pdf"
PORTRAIT = ROOT / "public" / "katharina-brenner-portrait-v3.jpg"

NAVY = HexColor("#061A33")
BLUE = HexColor("#2856F6")
YELLOW = HexColor("#FFD21C")
PAPER = HexColor("#F4F4F1")
INK_SOFT = HexColor("#59616C")
LINE = HexColor("#C9CBD1")
WHITE = HexColor("#FBFBF9")

pdfmetrics.registerFont(TTFont("Georgia", "/System/Library/Fonts/Supplemental/Georgia.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Italic", "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"))


def draw_cover_image(c, image_path, x, y, width, height):
    image = ImageReader(str(image_path))
    source_width, source_height = image.getSize()
    scale = max(width / source_width, height / source_height)
    draw_width = source_width * scale
    draw_height = source_height * scale
    c.saveState()
    path = c.beginPath()
    path.roundRect(x, y, width, height, 4)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(
        image,
        x - (draw_width - width) / 2,
        y - (draw_height - height) * 0.58,
        draw_width,
        draw_height,
        preserveAspectRatio=True,
        mask="auto",
    )
    c.restoreState()


def draw_paragraph(c, text, style, x, y_top, width):
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, 1000)
    paragraph.drawOn(c, x, y_top - height)
    return y_top - height


def section_label(c, text, x, y, width):
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawString(x, y, text.upper())
    c.setStrokeColor(LINE)
    c.setLineWidth(0.55)
    c.line(x, y - 7, x + width, y - 7)
    return y - 21


def role_entry(c, date, title, org, description, x, y, width, body_style):
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(x, y, date.upper())
    c.setFillColor(NAVY)
    c.setFont("Georgia", 11.5)
    c.drawString(x + 73, y - 1, title)
    c.setFillColor(INK_SOFT)
    c.setFont("Helvetica-Bold", 7.6)
    c.drawString(x + 73, y - 14, org)
    y = draw_paragraph(c, description, body_style, x + 73, y - 23, width - 73)
    return y - 12


def publication_entry(c, year, title, journal, x, y, width, small_style):
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(x, y, year)
    y = draw_paragraph(c, f"<b>{title}</b><br/><font color='#59616C'>{journal}</font>", small_style, x + 38, y + 1, width - 38)
    return y - 8


def skill_item(c, title, description, x, y, width, small_style):
    c.setFillColor(YELLOW)
    c.circle(x + 3, y - 3, 2.1, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 13, y, title)
    return draw_paragraph(c, description, small_style, x + 13, y - 8, width - 13) - 10


def create_cv():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    width, height = A4
    c.setTitle("Katharina Julia Brenner - Curriculum Vitae")
    c.setAuthor("Katharina Julia Brenner")
    c.setSubject("Industrial Process Modeling, Bioengineering, Digital Twins and AI")

    c.setFillColor(PAPER)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    header_h = 168
    c.setFillColor(NAVY)
    c.rect(0, height - header_h, width, header_h, stroke=0, fill=1)
    c.setStrokeColor(HexColor("#203B5A"))
    c.setLineWidth(0.35)
    for grid_x in range(0, int(width), 42):
        c.line(grid_x, height - header_h, grid_x, height)

    left = 42
    c.setFillColor(YELLOW)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(left, height - 39, "KATHARINA JULIA BRENNER / CV 2026")
    c.setFillColor(WHITE)
    c.setFont("Georgia", 29)
    c.drawString(left, height - 78, "Katharina Julia")
    c.setFont("Georgia-Italic", 29)
    c.setFillColor(YELLOW)
    c.drawString(left, height - 111, "Brenner")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left, height - 135, "INDUSTRIAL PROCESS MODELER + BIOENGINEER")
    c.setFillColor(HexColor("#AAB7C6"))
    c.setFont("Helvetica", 7.4)
    c.drawString(left, height - 151, "Munich, Germany  |  katharina.brenner@tum.de  |  katharinabrenner.com")

    draw_cover_image(c, PORTRAIT, width - 151, height - 153, 109, 128)
    c.setStrokeColor(YELLOW)
    c.setLineWidth(1.4)
    c.line(width - 151, height - 158, width - 42, height - 158)

    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=8.25,
        leading=12.2,
        textColor=INK_SOFT,
        alignment=TA_LEFT,
    )
    small_style = ParagraphStyle(
        "Small",
        fontName="Helvetica",
        fontSize=7.2,
        leading=10.2,
        textColor=NAVY,
        alignment=TA_LEFT,
    )
    intro_style = ParagraphStyle(
        "Intro",
        fontName="Georgia",
        fontSize=12.2,
        leading=16.6,
        textColor=NAVY,
        alignment=TA_LEFT,
    )

    main_x = 42
    main_w = 324
    side_x = 394
    side_w = width - side_x - 42
    top = height - header_h - 30

    y = section_label(c, "Profile", main_x, top, main_w)
    y = draw_paragraph(
        c,
        "I build quantitative, plant-wide models that make complex industrial and bioengineering processes visible, comparable, and ready for better scale-up decisions.",
        intro_style,
        main_x,
        y,
        main_w,
    ) - 20

    y = section_label(c, "Selected experience", main_x, y, main_w)
    y = role_entry(
        c,
        "2023 - now",
        "PhD Candidate + Scientific Staff",
        "Technical University of Munich - Cellular Agriculture",
        "Industrial process modeling, bioprocess scale-up, digital twins, techno-economic and environmental decision support.",
        main_x,
        y,
        main_w,
        body_style,
    )
    y = role_entry(
        c,
        "2024 - now",
        "Founder",
        "Future Foods at TUM",
        "Building an interdisciplinary community around sustainable food, advanced technologies, research, and entrepreneurship.",
        main_x,
        y,
        main_w,
        body_style,
    )
    y = role_entry(
        c,
        "2017",
        "Class of Fall 2017",
        "Center for Digital Technology and Management (CDTM)",
        "Interdisciplinary innovation and technology management alongside a foundation in business administration.",
        main_x,
        y,
        main_w,
        body_style,
    )

    y = section_label(c, "Selected work", main_x, y + 1, main_w)
    y = publication_entry(
        c,
        "01",
        "Cultivated Meat Process Model",
        "Open, interactive facility model from media preparation through packaging.",
        main_x,
        y,
        main_w,
        small_style,
    )
    y = publication_entry(
        c,
        "02",
        "BioTA - Bioreactor Technical Analysis",
        "Open workflow for yield prediction, optimization, and future CFD coupling.",
        main_x,
        y,
        main_w,
        small_style,
    )
    y = publication_entry(
        c,
        "03",
        "Process Intelligence Systems",
        "Digital twins and decision interfaces connecting process physics with action.",
        main_x,
        y,
        main_w,
        small_style,
    )

    side_y = section_label(c, "Core expertise", side_x, top, side_w)
    side_y = skill_item(c, "Process systems", "Plant-wide simulation, mass and energy balances, facility architecture.", side_x, side_y, side_w, small_style)
    side_y = skill_item(c, "Scale-up", "Bioreactors, utilities, bottlenecks, scenarios, TEA and LCA.", side_x, side_y, side_w, small_style)
    side_y = skill_item(c, "Digital engineering", "Python, data science, AI, digital twins, decision tools.", side_x, side_y, side_w, small_style)
    side_y = skill_item(c, "Analytical foundation", "Mathematics, statistics, uncertainty, optimization.", side_x, side_y, side_w, small_style)

    side_y = section_label(c, "Selected publications", side_x, side_y - 4, side_w)
    side_y = publication_entry(c, "2026", "Decoding cultured meat manufacturing", "Frontiers in Nutrition", side_x, side_y, side_w, small_style)
    side_y = publication_entry(c, "2026", "Waste stream valorization in cultured meat manufacturing", "Applied Food Research", side_x, side_y, side_w, small_style)
    side_y = publication_entry(c, "2025", "Bioreactor parameters and systems for cultured meat production", "Future Foods", side_x, side_y, side_w, small_style)
    side_y = publication_entry(c, "2025", "Technology and processes for cultivated meat", "Ernahrungs Umschau", side_x, side_y, side_w, small_style)

    side_y = section_label(c, "Selected stations", side_x, side_y - 10, side_w)
    side_y = draw_paragraph(
        c,
        "Cambridge  /  TUM  /  CDTM  /  Bayerische EliteAkademie  /  LMU  /  Stanford  /  KAIST  /  TUM Venture Labs",
        small_style,
        side_x,
        side_y,
        side_w,
    ) - 17

    side_y = section_label(c, "Recognition", side_x, side_y, side_w)
    side_y = draw_paragraph(
        c,
        "<b>Deutschlandstipendium</b>, 2022<br/><b>Lothar-und-Sigrid-Rohde-Stiftung</b>, 2021<br/><b>Bayerische EliteAkademie</b>, Class of 2017<br/><b>Languages</b>: German, English",
        small_style,
        side_x,
        side_y,
        side_w,
    )

    c.setFillColor(NAVY)
    c.rect(0, 0, width, 47, stroke=0, fill=1)
    c.setFillColor(YELLOW)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(42, 29, "OPEN TO")
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 8.2)
    c.drawString(92, 29, "Industrial modeling projects  /  Research collaborations  /  Technical ventures")
    c.setFillColor(HexColor("#AAB7C6"))
    c.setFont("Helvetica", 6.7)
    c.drawRightString(width - 42, 14, "linkedin.com/in/katharina-julia-brenner  |  github.com/katharina-brenner")

    c.showPage()
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    create_cv()
