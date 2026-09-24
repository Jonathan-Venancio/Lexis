from app.srs import apply_grade


class FakeWord:
    def __init__(self):
        self.interval_days = 0
        self.difficulty = 3
        self.review_count = 0
        self.success_count = 0
        self.last_reviewed_at = None
        self.next_review_at = None
        self.status = "new"


def test_good_from_new_is_one_day():
    word = apply_grade(FakeWord(), "good")
    assert word.interval_days == 1
    assert word.status == "review"
    assert word.last_grade == "good"
    assert word.success_count == 1


def test_again_stays_learning():
    word = apply_grade(FakeWord(), "again")
    assert word.interval_days == 0
    assert word.status == "learning"
    assert word.success_count == 0
