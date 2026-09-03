from sivraj.intelligence.prompts import SYSTEM_PROMPT


def test_system_prompt_has_casual_manglish_rules() -> None:
    assert "You MUST understand common Kerala Manglish" in SYSTEM_PROMPT
    assert '"entha parupadi"' in SYSTEM_PROMPT
    assert "reply in Malayalam script" in SYSTEM_PROMPT
    assert 'Do not use "നിങ്ങൾ"' in SYSTEM_PROMPT
    assert "CPU usage 24% ആണ്" in SYSTEM_PROMPT


def test_system_prompt_keeps_tool_safety_boundary() -> None:
    assert "Never invent system readings" in SYSTEM_PROMPT
    assert "cannot run shell commands" in SYSTEM_PROMPT
