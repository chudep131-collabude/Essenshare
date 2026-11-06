Bug Report: User-Level Skills and Steering Files Are Not Inherited by Workflow Agents

Submitted by: Kiro User  
Date: October 2026  
Severity: High Core feature gap that undermines the value of the user-level configuration system  
Category: Agent Behavior / Skills & Steering System



 Summary

User-level skill files (~/.kiro/skills/) and steering files (~/.kiro/steering/) are not passed to workflow step agents. Agents spawned inside workflows operate in fully isolated sessions with no access to the user's configured rules, design standards, security policies, or quality constraints even when those files are explicitly marked inclusion: always.

This makes the entire user-level configuration system ineffective for any substantive work, since most real implementation work is delegated to workflow agents.



 Environment

Product: Kiro IDE
Version: Latest (October 2026)
OS: Windows 11
Shell: PowerShell



 What Was Configured

The following files were set up in C:\Users\[user]\.kiro\ with significant time investment:

 Skills (~/.kiro/skills/)
SKILL.md marked inclusion: always. Contains UI design quality rules, instructions to always read design packs before writing UI, non-negotiable quality standards, and accessibility minimums.
design-advanced/ awwwards-level UI quality standards
backend/ backend engineering standards
gsap/ animation rules
realtime/ realtime system patterns
enterprise/ enterprise engineering constraints
animation-forge/ motion design rules

 Steering (~/.kiro/steering/)
soc2.md SOC 2 compliance rules (auth, PII handling, audit trails, secrets management)
production-standards.md mobile-first, performance budgets, RTL support
no-improvise.md rules against silent substitution
asset-demands.md rules for demanding real assets instead of placeholders
agent-efficiency.md workflow tier rules

 Designs (~/.kiro/designs/)
A full library of design packs across 12 categories each containing exact color tokens, typography scales, component patterns, and do/don'ts for professional UI output.



 What Was Expected

When workflow agents are spawned to perform implementation tasks, they should inherit:

1. All steering files marked inclusion: always from ~/.kiro/steering/
2. All skill files marked inclusion: always from ~/.kiro/skills/
3. Or at minimum, the top-level orchestrating agent should automatically inject this content into every workflow step prompt it generates

This is the reasonable expectation from a user who invested time configuring these files that they apply universally across all agents and sessions, not just the top-level conversation.



 What Actually Happened

Workflow step agents (wf-coder, wf-planner, semantic_reviewer, etc.) ran in completely isolated sessions with no access to any of the above files.

 Concrete Example Essenshare Project (October 2026)

A full Next.js frontend was built by workflow agents that:

Never read a single design pack despite SKILL.md explicitly requiring this before any UI work
Invented a generic colour palette instead of using the design library
Used banned UI patterns explicitly listed in SKILL.md (e.g. three identical feature cards in a row)
Did not apply awwwards-level quality standards from design-advanced/
Did not enforce SOC2 rules from soc2.md
Did not follow production standards from production-standards.md

The top-level orchestrating agent had the steering files injected but did not pass them into the workflow brief so agents operated with none of the user's established rules. The user only discovered this after the entire frontend was built, requiring a full rebuild.



 Impact

1. Wasted configuration time hours spent setting up skills and steering files that have no effect on the agents doing actual work
2. Wasted build time entire features need to be rebuilt when agents produce output that violates the user's standards
3. Broken trust inclusion: always should mean always, not "only in the top-level chat session"
4. No recourse users cannot force workflow agents to respect their configuration without manually copy-pasting rules into every single workflow prompt, which defeats the entire purpose of the system



 Steps to Reproduce

1. Create ~/.kiro/skills/SKILL.md with inclusion: always containing UI quality rules
2. Create steering files at ~/.kiro/steering/ with design and security rules
3. Ask Kiro to build any UI feature that triggers a workflow
4. Inspect the workflow agent's output it will not reflect any user-level rules
5. Compare output against the rules in SKILL.md violations will be present



 Expected Behavior

One or more of the following should be true:

Option A: Workflow step agents automatically inherit all user-level inclusion: always skills and steering files at session creation.

Option B: The top-level orchestrating agent automatically injects all active skill and steering content into every workflow step prompt it generates.

Option C: The workflow system exposes a mechanism for declaring "apply user skills" when creating a workflow, which the runtime resolves and injects.

At minimum, the documentation should clearly state that user-level skills do NOT apply to workflow agents, so users do not invest time configuring a system that silently does nothing.



 Priority Justification

Affects every user who has invested in the skill/steering system
The failure is silent users don't know their rules aren't being applied until they inspect the output
Undermines one of Kiro's core differentiators (configurable, rule-following agents)
The more a user invests in configuration, the more disappointed they will be



 Suggested Fix

Propagate user-level inclusion: always skills and steering files to all workflow agent sessions automatically, or provide a documented mechanism for the orchestrator to do so explicitly.



Submitted to help the Kiro team identify and fix a core gap in the agent configuration system.
