from .service import utcnow
from ..extensions import db


class JobRun(db.Model):
    """Marks that the daily background sweep (retainer invoicing +
    post-project follow-up) has run for a given calendar date. The unique
    constraint on (job_name, run_date) IS the guarantee — "at most once
    per day" — enforced at the DB level the same way Payment.provider_reference's
    uniqueness is what makes payment idempotency real, not just a status
    check. See services/job_runner_service.py.

    No cron/scheduler exists in this deployment (Render's free tier
    doesn't include one, and adding an external dependency was explicitly
    ruled out for now) — this table is what lets the daily sweep trigger
    opportunistically off real admin traffic instead, without ever running
    twice in one day even under concurrent requests.
    """

    __tablename__ = "job_runs"

    id = db.Column(db.Integer, primary_key=True)
    job_name = db.Column(db.String(60), nullable=False)
    run_date = db.Column(db.Date, nullable=False)
    ran_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("job_name", "run_date", name="uq_job_runs_job_date"),)

    def __repr__(self):
        return f"<JobRun {self.job_name!r} on {self.run_date}>"
