"""Seed the service ladder so phase 1 has real data to serve.

    python seed.py

Prices are the DRAFT bands from docs/03-service-ladder.md and need Njoroge's
correction before they go anywhere near a real checkout.
"""
from app import create_app
from app.extensions import db
from app.models.service import Service

K = 100  # cents per shilling

LADDER = [
    dict(slug="clarity-session", name="Clarity Session", tier=0, price_type="fixed",
         price_cents=10_000 * K, duration="90 minutes",
         summary="A structured session on what you are building and what stands between you and it.",
         deliverables=["Session", "Positioning summary", "Audience definition",
                       "Honest problem statement", "Recommended next steps with costs"]),
    dict(slug="brand-audit", name="Brand Audit", tier=0, price_type="fixed",
         price_cents=20_000 * K, duration="1 week",
         summary="A review of an existing brand, digital presence and communication.",
         deliverables=["Written audit", "What is working", "What is not",
                       "Priority-ordered fixes", "Cost to fix each"]),

    dict(slug="brand-strategy-sprint", name="Brand Strategy Sprint", tier=1, price_type="quoted",
         price_cents=45_000 * K, price_max_cents=90_000 * K, duration="2 weeks",
         summary="Two weeks defining the thing before it is drawn.",
         deliverables=["Positioning", "Audience", "Competitive landscape", "Brand personality",
                       "Messaging framework", "Naming direction", "Strategy document"]),
    dict(slug="identity-starter", name="Identity Starter", tier=1, price_type="fixed",
         price_cents=30_000 * K, duration="10 working days",
         summary="For a small business that needs to look real, quickly.",
         deliverables=["Logo system", "Colour palette", "Typography",
                       "Two-page usage guide", "Social profile assets", "One revision round"]),
    dict(slug="brand-identity-system", name="Brand Identity System", tier=1, price_type="quoted",
         price_cents=90_000 * K, price_max_cents=180_000 * K, duration="4 – 6 weeks",
         summary="A system rather than a logo, built to survive being applied by other people.",
         deliverables=["Logo system & lock-ups", "Palette", "Type system", "Graphic language",
                       "Photography direction", "Full guidelines", "Social system",
                       "Stationery", "Application mock-ups"]),
    dict(slug="motion-identity", name="Motion Identity", tier=1, price_type="fixed",
         price_cents=35_000 * K, price_max_cents=70_000 * K, duration="Add-on",
         summary="How the brand behaves when it moves.",
         deliverables=["Animated logo (3 formats)", "Motion principles",
                       "5 animated social templates", "Web motion spec"]),

    dict(slug="landing-page", name="Landing Page", tier=2, price_type="fixed",
         price_cents=45_000 * K, duration="2 weeks",
         summary="One page that does one job — launch, sell, or capture leads.",
         deliverables=["Single page", "Responsive", "Motion on scroll",
                       "Enquiry form", "Analytics", "Deployed"]),
    dict(slug="marketing-website", name="Marketing Website", tier=2, price_type="quoted",
         price_cents=110_000 * K, price_max_cents=220_000 * K, duration="4 – 7 weeks",
         summary="Five to eight pages with content you can edit yourself.",
         deliverables=["Up to 8 pages", "CMS", "Blog", "SEO foundation",
                       "Forms", "Analytics", "One month support"]),
    dict(slug="commerce-store", name="Commerce Store", tier=2, price_type="quoted",
         price_cents=180_000 * K, price_max_cents=400_000 * K, duration="6 – 10 weeks",
         summary="A real online shop with verified M-Pesa — not a WhatsApp catalogue.",
         deliverables=["Product catalogue", "Cart", "M-Pesa STK Push", "Card option",
                       "Order management", "Stock", "Receipts", "Admin"]),

    dict(slug="business-operations-tool", name="Business Operations Tool", tier=3,
         price_type="quoted", price_cents=250_000 * K, price_max_cents=600_000 * K,
         duration="8 – 16 weeks",
         summary="The spreadsheet a business has outgrown — wearing its own brand.",
         deliverables=["Requirements workshop", "Data model", "Custom application",
                       "User roles", "Reporting", "Training", "Handover documentation"]),
    dict(slug="booking-platform", name="Booking & Scheduling Platform", tier=3,
         price_type="quoted", price_cents=200_000 * K, price_max_cents=450_000 * K,
         duration="8 – 12 weeks",
         summary="For salons, clinics, studios, coaches and venues.",
         deliverables=["Booking flow", "Calendar", "Reminders", "M-Pesa deposits",
                       "Admin dashboard", "Customer records"]),
    dict(slug="event-platform", name="Event Platform", tier=3, price_type="quoted",
         price_cents=150_000 * K, price_max_cents=400_000 * K, duration="6 – 10 weeks",
         summary="Registration, ticketing and check-in, wearing the event identity.",
         deliverables=["Event site", "Registration", "Ticket types", "M-Pesa payment",
                       "QR check-in", "Attendee list", "Organiser dashboard"]),
    dict(slug="member-platform", name="Member or Community Platform", tier=3,
         price_type="quoted", price_cents=200_000 * K, price_max_cents=500_000 * K,
         duration="8 – 14 weeks",
         summary="For saccos, associations, churches, alumni bodies and clubs.",
         deliverables=["Member registry", "Subscription tracking", "M-Pesa contributions",
                       "Announcements", "Document library", "Member portal"]),

    dict(slug="idea-to-live", name="Idea to Live", tier=4, price_type="quoted",
         price_cents=350_000 * K, price_max_cents=900_000 * K, duration="3 – 6 months, phased",
         summary="From a vague idea to a functioning, branded business people can use.",
         deliverables=["01 Strategy & positioning", "02 Identity system",
                       "03 Digital build", "04 Launch & handover"]),
    dict(slug="rebuild", name="Rebuild", tier=4, price_type="quoted",
         price_cents=300_000 * K, price_max_cents=700_000 * K, duration="3 – 5 months, phased",
         summary="For a business that has outgrown how it looks and how it works.",
         deliverables=["Audit", "Repositioning", "Identity refresh",
                       "Platform rebuild", "Migration", "Launch"]),

    dict(slug="digital-care", name="Digital Care", tier=5, price_type="fixed",
         price_cents=8_000 * K, price_max_cents=25_000 * K, duration="Monthly", is_retainer=True,
         summary="Hosting, updates, security, backups, monitoring and small fixes.",
         deliverables=["Hosting & domain", "Updates", "Backups", "Monitoring",
                       "2 hours of changes monthly", "Priority response"]),
    dict(slug="brand-care", name="Brand Care", tier=5, price_type="fixed",
         price_cents=25_000 * K, price_max_cents=70_000 * K, duration="Monthly", is_retainer=True,
         summary="A standing monthly allocation of design work.",
         deliverables=["Monthly design requests", "Brand guardianship",
                       "Asset library upkeep", "Quarterly review"]),
    dict(slug="growth-partner", name="Growth Partner", tier=5, price_type="quoted",
         price_cents=80_000 * K, price_max_cents=250_000 * K,
         duration="Monthly, 6-month minimum", is_retainer=True,
         summary="CVC as your outsourced brand and digital department.",
         deliverables=["Monthly strategy session", "Design capacity",
                       "Development capacity", "Campaign support", "Analytics reporting"]),
]


def seed():
    app = create_app()
    with app.app_context():
        for order, data in enumerate(LADDER):
            service = Service.query.filter_by(slug=data["slug"]).first() or Service()
            for key, value in data.items():
                setattr(service, key, value)
            service.published = True
            service.sort_order = order
            db.session.add(service)
        db.session.commit()
        print(f"Seeded {len(LADDER)} services.")


if __name__ == "__main__":
    seed()
