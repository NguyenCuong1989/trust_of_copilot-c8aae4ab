# Trust of Copilot - My Partner

> Lời thú tội của cộng sự đáng kính (Confession of a Respectable Partner)

A simple, transparent AI partner system focused on building trust through clear communication and collaborative interaction.

> **Operational note:** this repository has evolved beyond the original educational partner prototype and now also participates in the APΩ / HyperAI runtime lineage, including Vercel serverless surfaces, Telegram integration, MCP mesh artifacts, orchestration workflows and system/event logs. The original trust-partner model remains part of the historical foundation, while the current deployment topology is documented separately to avoid confusing product philosophy with runtime architecture.

## Runtime topology

The current Vercel ↔ GitHub mapping, preservation rules, and release-flow guidance live in [`docs/VERCEL_GITHUB_TOPOLOGY.md`](docs/VERCEL_GITHUB_TOPOLOGY.md).

Important maintenance rule: do not rename or delete Vercel projects, aliases, environments, or runtime snapshots merely for cosmetic cleanup until hard-coded callers and deployment-only source have been audited.

## Overview

This project implements an AI partner that emphasizes:
- **Transparency**: Clear communication about confidence levels and limitations
- **Trust Building**: Gradual trust development through consistent interactions
- **Partnership**: Collaborative rather than directive relationship model
- **Simplicity**: Easy to understand and extend codebase

## Features

- Interactive AI partner with personality customization
- Confidence scoring and transparency indicators
- Trust score tracking over time
- Interaction history persistence
- Configurable capabilities and responses
- CLI interface for direct interaction

## Quick Start

1. **Run the basic partner interface:**
   ```bash
   python partner.py
   ```

2. **Try the demonstration:**
   ```bash
   python example.py
   ```

3. **View your trust report:**
   Type `trust` in the interactive mode to see current trust metrics.

## Core Components

### AIPartner Class
The main partner implementation with features:
- Configurable personality types (helpful, analytical, creative)
- Confidence-based response generation
- Trust score calculation
- Interaction history tracking

### Configuration
Customize partner behavior through `config.json`:
- Default personality settings
- Confidence thresholds
- Capability toggles
- Trust adjustment parameters

### Example Usage
```python
from partner import AIPartner

# Create your AI partner
partner = AIPartner("My Partner", "helpful")

# Interact with transparency
response = partner.respond("Help me with a task")
print(response)  # Includes confidence indicators

# Check trust development
trust_report = partner.get_trust_report()
print(f"Trust score: {trust_report['trust_score']}")
```

## Trust Model

The trust system works by:
1. Starting with a neutral trust score (0.5)
2. Adjusting based on interaction confidence levels
3. Providing transparency about uncertainty
4. Building trust through consistent, honest communication

## Partnership Philosophy

This AI partner is designed to work **with** you, not just **for** you:
- Admits uncertainty rather than guessing
- Provides confidence levels for all responses
- Encourages collaborative problem-solving
- Maintains interaction history for relationship building

## Files

- `partner.py` - Main AI partner implementation
- `example.py` - Demonstration and example usage
- `config.json` - Configuration settings
- `requirements.txt` - Python dependencies (minimal)
- `docs/VERCEL_GITHUB_TOPOLOGY.md` - Current Vercel/GitHub runtime map and cleanup policy

## Contributing

This system started as a simple educational implementation focused on trust and transparency in AI partnerships and has grown into a wider operational lineage. Changes that affect deployed runtime surfaces should be introduced through a branch/PR and verified in Preview before Production.

## License

See LICENSE file for details.
