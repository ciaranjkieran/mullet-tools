from django.urls import path
from .views import (
    StartTimerView,
    StopTimerView,
    ActiveTimerView,
    TimeEntriesView,
    TimeEntryDetailView,
    StatsDailyView,
    StatsSummaryView,
    StatsTreeView,
    StatsChainUpView,   # ⬅️ new
    ClearStatsView

)
from .views import CompleteNextView

urlpatterns = [
    path("timer/start", StartTimerView.as_view(), name="timer-start"),
    path("timer/stop", StopTimerView.as_view(), name="timer-stop"),
    path("timer/active", ActiveTimerView.as_view(), name="timer-active"),

    path("time-entries", TimeEntriesView.as_view(), name="time-entries"),
    path("time-entries/<int:pk>", TimeEntryDetailView.as_view(), name="time-entry-detail"),
    path("timer/complete-next", CompleteNextView.as_view(), name="timer-complete-next"),


    path("stats/summary", StatsSummaryView.as_view(), name="stats-summary"),
    path("stats/daily", StatsDailyView.as_view(), name="stats-daily"),
    path("stats/tree", StatsTreeView.as_view(), name="stats-tree"),

    # ⬇️ new chain-up endpoint
    path("stats/chain-up", StatsChainUpView.as_view(), name="stats-chain-up"),
        path("stats/clear", ClearStatsView.as_view(), name="stats-clear"),

]
