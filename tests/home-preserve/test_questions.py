"""The readiness replay cannot excuse an eligible refusal or a mismatched fixture."""
import copy
import unittest

from matrix import matched_questions


class QuestionGateTests(unittest.TestCase):
    def setUp(self):
        ready = dict(eligible=True, context=True, active=None, emotion='normal', suppressIdle=False)
        busy = dict(ready, eligible=False, active='banter')
        state = ['memory_lake', 5, None, 'day', 18, True]
        self.base = dict(fixture='save', target='pet', lifecycle=dict(first=state, initialQuestion=ready),
                         observation=dict(end=dict(clock=30),trajectorySha256='journey'))
        self.trial = dict(self.base, lifecycle=dict(first=state, initialQuestion=busy))
        attempt = dict(ready=ready, before=state, residents=['dog'], question='q', started=True, active='question', id='q')
        replay = dict(check=attempt, errors=[], fixture='save', clock=30, target='pet', trajectory='journey')
        self.replays = {arm: copy.deepcopy(replay) for arm in ('production', 'candidate')}

    def accepts(self):
        return matched_questions(self.replays, self.base, self.trial)

    def test_busy_initial_attempt_requires_two_matching_real_starts(self):
        self.assertTrue(self.accepts())
        for field, value in [('started', False), ('active', 'banter'), ('residents', ['other']), ('id', 'other')]:
            with self.subTest(field=field):
                attempt = self.replays['candidate']['check']
                previous = attempt[field]
                attempt[field] = value
                self.assertFalse(self.accepts())
                attempt[field] = previous

    def test_eligible_initial_refusal_cannot_be_replaced_by_replay(self):
        self.trial['lifecycle']['initialQuestion'] = self.base['lifecycle']['initialQuestion']
        self.assertFalse(self.accepts())

    def test_original_target_clock_and_save_must_match(self):
        for field, value in [('target', 'other'), ('trajectory', 'other'), ('clock', 29), ('fixture', 'other'), ('errors', ['error'])]:
            with self.subTest(field=field):
                replay = self.replays['candidate']
                previous = replay[field]
                replay[field] = value
                self.assertFalse(self.accepts())
                replay[field] = previous


if __name__ == '__main__':
    unittest.main()
