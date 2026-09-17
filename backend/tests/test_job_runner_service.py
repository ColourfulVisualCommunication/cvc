"""Phase 7 — the JobRun idempotency guard: run_daily_jobs_if_due must run
the underlying daily jobs at most once per calendar day, even across two
calls for the same date (the same double-call pattern already used for
payment idempotency in test_invoice_service.py).

_run_daily_jobs itself is stubbed out here rather than actually invoked —
it transitively calls project_service.send_due_followups(), which sweeps
the *entire* projects table with no scoping. That's safe to exercise
directly in test_project_service.py (which guards against pre-existing
matching real rows before touching anything), but this file only needs to
prove the once-a-day gate works, not re-run that sweep a second time.
"""
from datetime import date

import pytest

from app import create_app
from app.extensions import db
from app.models.job_run import JobRun
from app.services import job_runner_service
from config import Config


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def app_context():
    app = create_app(TestConfig)
    with app.app_context():
        yield
        # See test_invoice_service.py's app_context fixture for why this
        # dispose() matters — undisposed engines across a full suite run
        # exhaust Supabase's session-mode connection cap.
        db.engine.dispose()


@pytest.fixture(autouse=True)
def stub_run_daily_jobs(app_context, monkeypatch):
    calls = []
    monkeypatch.setattr(job_runner_service, "_run_daily_jobs", lambda: calls.append(1))
    return calls


@pytest.fixture(autouse=True)
def cleanup_job_run(app_context):
    yield
    JobRun.query.filter_by(job_name="daily", run_date=date(2026, 6, 1)).delete()
    db.session.commit()


def test_run_daily_jobs_if_due_runs_once_for_the_same_day(stub_run_daily_jobs):
    today = date(2026, 6, 1)

    first = job_runner_service.run_daily_jobs_if_due(today=today)
    second = job_runner_service.run_daily_jobs_if_due(today=today)

    assert first is True
    assert second is False
    assert len(stub_run_daily_jobs) == 1


def test_run_daily_jobs_if_due_runs_again_on_a_new_day(stub_run_daily_jobs):
    job_runner_service.run_daily_jobs_if_due(today=date(2026, 6, 1))
    ran_again = job_runner_service.run_daily_jobs_if_due(today=date(2026, 6, 2))

    assert ran_again is True
    assert len(stub_run_daily_jobs) == 2

    JobRun.query.filter_by(job_name="daily", run_date=date(2026, 6, 2)).delete()
    db.session.commit()
