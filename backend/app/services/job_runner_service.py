"""The free-tier-only scheduled-job mechanism (see the Phase 7 build plan
for the full rationale). No cron exists in this deployment — Render's
free tier has no cron service, and an external one (e.g. GitHub Actions)
was explicitly ruled out as an added dependency. Instead, the daily sweep
triggers opportunistically off real admin traffic, gated by JobRun's
unique (job_name, run_date) constraint so it never runs twice in a day
even under concurrent requests — the same INSERT-first/catch-conflict
idiom already used for payment idempotency, just against a different
table.

Swappable later for a real Render Cron Job (once the plan is paid) by
calling `flask run-daily-jobs` on a schedule instead — _run_daily_jobs
itself doesn't change either way.
"""
import logging
from datetime import date

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.job_run import JobRun

logger = logging.getLogger(__name__)

JOB_NAME = "daily"


def run_daily_jobs_if_due(today=None) -> bool:
    """Returns True if it actually ran. Try to claim today's run by
    inserting first; only the request (or process) that wins the unique
    constraint does the work. A cheap existence check first avoids hitting
    the constraint — and the resulting rollback — on every single request
    for the rest of the day once it's already run.
    """
    today = today or date.today()

    if JobRun.query.filter_by(job_name=JOB_NAME, run_date=today).first() is not None:
        return False

    try:
        db.session.add(JobRun(job_name=JOB_NAME, run_date=today))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return False

    _run_daily_jobs()
    return True


def _run_daily_jobs():
    """Each job is independently try/excepted so one failing (a bug, a
    down email provider) never blocks the other from running.
    """
    from . import retainer_service, project_service

    try:
        retainer_service.generate_due_invoices()
    except Exception:
        logger.exception("daily jobs: retainer invoicing failed")

    try:
        project_service.send_due_followups()
    except Exception:
        logger.exception("daily jobs: follow-up sweep failed")
