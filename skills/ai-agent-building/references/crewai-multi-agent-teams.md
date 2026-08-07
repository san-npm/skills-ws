## CrewAI: Multi-Agent Teams

```python
# pip install crewai crewai-tools
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, ScrapeWebsiteTool

# Define specialized agents
researcher = Agent(
    role="Senior Research Analyst",
    goal="Find comprehensive, accurate information about the given topic",
    backstory="You're a seasoned researcher with 15 years of experience in market analysis.",
    tools=[SerperDevTool(), ScrapeWebsiteTool()],
    verbose=True,
    allow_delegation=False,
    llm="gpt-5.5",
)

writer = Agent(
    role="Technical Writer",
    goal="Create clear, engaging content based on research findings",
    backstory="You're a technical writer who excels at making complex topics accessible.",
    verbose=True,
    llm="gpt-5.5",
)

editor = Agent(
    role="Editor",
    goal="Review and polish the content for accuracy, clarity, and engagement",
    backstory="You're a meticulous editor with an eye for detail and factual accuracy.",
    verbose=True,
    llm="gpt-5.5",
)

# Define tasks
research_task = Task(
    description="Research the current state of {topic}. Find key trends, statistics, and expert opinions.",
    expected_output="A comprehensive research brief with key findings, statistics, and sources.",
    agent=researcher,
)

writing_task = Task(
    description="Write a 1500-word article based on the research brief.",
    expected_output="A well-structured article with introduction, key sections, and conclusion.",
    agent=writer,
    context=[research_task],  # Uses output from research
)

editing_task = Task(
    description="Edit the article for clarity, accuracy, and engagement. Fix any factual errors.",
    expected_output="A polished, publication-ready article.",
    agent=editor,
    context=[writing_task],
)

# Assemble crew
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, editing_task],
    process=Process.sequential,  # or Process.hierarchical with a manager
    verbose=True,
)

result = crew.kickoff(inputs={"topic": "AI agents in production"})
```

---
