"""Export the FastAPI OpenAPI spec to openapi.json in the project root."""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from immosimple_agent.main import app  # noqa: E402

output = Path(__file__).parent.parent / "openapi.json"
output.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False))
print(f"OpenAPI spec written to {output}")
