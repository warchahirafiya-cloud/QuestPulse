import unittest

from questpulse_video_worker import make_script, make_terms, output_relative_path


class WorkerAdapterTests(unittest.TestCase):
    def test_arabic_script_uses_only_reviewed_source_fields(self):
        source = {"title": "منحة تعليمية", "description": "برنامج يقدم دورات مجانية"}
        script = make_script(source, "ar")
        self.assertIn(source["title"], script)
        self.assertIn(source["description"], script)
        self.assertIn("QuestPulse", script)
        self.assertIn("تحقق من الأهلية", script)

    def test_english_script_is_bounded_to_source_content(self):
        source = {"title": "Learning program", "description": "Free online courses"}
        script = make_script(source, "en")
        self.assertIn("Learning program", script)
        self.assertIn("Free online courses", script)
        self.assertIn("verify eligibility", script)

    def test_terms_are_deterministic_and_deduplicated(self):
        terms = make_terms({"title": "Digital digital rewards", "description": "Rewards and online services"}, "en")
        self.assertEqual(len(terms), len(set(terms)))
        self.assertLessEqual(len(terms), 8)

    def test_only_mpt_task_relative_mp4_paths_are_accepted(self):
        self.assertEqual(output_relative_path("http://mpt", "http://mpt/tasks/abc/final.mp4"), "abc/final.mp4")
        self.assertEqual(output_relative_path("http://mpt", "tasks/abc/final.mp4"), "abc/final.mp4")
        for unsafe in ("../../secret.mp4", "https://evil.example/file.mp4", "/download/etc/passwd", "tasks/../secret.mp4", "tasks/a/file.txt"):
            with self.subTest(value=unsafe), self.assertRaises(ValueError):
                output_relative_path("http://mpt", unsafe)


if __name__ == "__main__":
    unittest.main()
