## Contents

- Safety: Prompt Injection Defense
- Input Validation
- Output Validation

## Safety: Prompt Injection Defense

### Input Validation

```python
import re

def sanitize_user_input(text: str) -> str:
    """Basic prompt injection defense."""
    # Remove common injection patterns
    suspicious_patterns = [
        r"ignore (?:all )?(?:previous |prior |above )?instructions",
        r"you are now",
        r"new instructions:",
        r"system prompt:",
        r"</s>|<\|im_end\|>|<\|endoftext\|>",
    ]
    for pattern in suspicious_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return "[Input contained suspicious patterns and was filtered]"
    return text
```

### Output Validation

```python
from pydantic import BaseModel, field_validator

class AgentResponse(BaseModel):
    answer: str
    sources: list[str]
    confidence: float

    @field_validator("answer")
    @classmethod
    def no_system_leaks(cls, v: str) -> str:
        forbidden = ["system prompt", "you are an AI", "as an AI language model"]
        for phrase in forbidden:
            if phrase.lower() in v.lower():
                raise ValueError("Response contained forbidden content")
        return v

    @field_validator("confidence")
    @classmethod
    def valid_range(cls, v: float) -> float:
        if not 0 <= v <= 1:
            raise ValueError("Confidence must be between 0 and 1")
        return v
```

---
