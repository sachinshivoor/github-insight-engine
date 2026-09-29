import os
import json
import re
import google.generativeai as genai
from typing import Optional


DEMO_REPO_RESPONSE = {
    "project_summary": "This is a well-structured open-source repository demonstrating modern software development practices. The project shows good architectural decisions with clear separation of concerns.",
    "architecture_assessment": "The repository follows a modular architecture with clean separation between layers. The codebase is organized logically with consistent naming conventions.",
    "strengths": [
        "Well-organized folder structure with clear separation of concerns",
        "Active maintenance with regular commits and updates",
        "Good documentation with README covering key areas",
        "Multi-language support showing technical breadth",
        "Community engagement indicated by stars and forks"
    ],
    "weaknesses": [
        "Test coverage could be improved for better reliability",
        "Some areas lack inline code documentation",
        "API documentation could be more comprehensive",
        "Dependency management could be modernized"
    ],
    "improvement_suggestions": [
        "Add comprehensive unit and integration tests to reach 80%+ coverage",
        "Implement automated CI/CD pipeline for continuous testing",
        "Add API documentation using tools like Swagger or JSDoc",
        "Create CONTRIBUTING.md with clear contribution guidelines",
        "Add code quality badges to README"
    ],
    "overall_rating": 7.8,
    "health_assessment": "The repository is in good health with active development and a growing community. Regular commits indicate ongoing maintenance.",
    "complexity_level": "Intermediate",
    "learning_difficulty": 5.5,
    "beginner_friendly_score": 6.0,
    "portfolio_value_score": 7.5,
    "detected_technologies": ["JavaScript", "Python", "Docker", "GitHub Actions"],
    "doc_quality_score": 7.0,
    "code_quality_score": 7.5,
    "doc_improvement_suggestions": [
        "Add installation prerequisites section",
        "Include usage examples with code snippets",
        "Add screenshots or GIFs for visual demonstration"
    ],
    "code_improvement_suggestions": [
        "Increase test coverage",
        "Add more inline comments for complex logic",
        "Consider adding type annotations"
    ],
    "learning_resources": {
        "articles": [
            {"title": "Getting Started Guide", "url": "https://docs.github.com", "description": "Official documentation and guides"},
            {"title": "Best Practices", "url": "https://github.com/topics", "description": "Community best practices"}
        ],
        "tutorials": [
            {"title": "Beginner Tutorial", "url": "https://www.freecodecamp.org", "description": "Free comprehensive tutorial"},
            {"title": "Advanced Patterns", "url": "https://dev.to", "description": "Advanced development patterns"}
        ],
        "videos": [
            {"title": "Full Course", "url": "https://www.youtube.com", "description": "Complete video course on YouTube"},
            {"title": "Quick Start", "url": "https://www.youtube.com", "description": "Quick start video tutorial"}
        ],
        "courses": [
            {"title": "Official Course", "url": "https://www.udemy.com", "description": "Comprehensive paid course"},
            {"title": "Free Bootcamp", "url": "https://www.freecodecamp.org", "description": "Free bootcamp course"}
        ]
    }
}

DEMO_TOPIC_RESPONSE = {
    "overview": "A comprehensive and in-demand technology field with wide industry adoption. Learning this technology opens doors to numerous career opportunities in modern software development.",
    "learning_roadmap": [
        {"step": "1", "title": "Fundamentals", "description": "Master the core concepts and basic syntax"},
        {"step": "2", "title": "Core Concepts", "description": "Deep dive into key patterns and best practices"},
        {"step": "3", "title": "Practical Projects", "description": "Build real-world projects to solidify knowledge"},
        {"step": "4", "title": "Advanced Topics", "description": "Explore advanced patterns and optimizations"},
        {"step": "5", "title": "Ecosystem & Tools", "description": "Learn the surrounding tools and ecosystem"},
        {"step": "6", "title": "Production Ready", "description": "Deploy and maintain production applications"}
    ],
    "required_skills": ["Problem Solving", "Version Control (Git)", "Command Line Basics", "Programming Fundamentals"],
    "popular_tools": [
        {"name": "VS Code", "description": "Popular code editor with great extensions"},
        {"name": "Git", "description": "Version control system"},
        {"name": "Docker", "description": "Containerization platform"}
    ],
    "career_opportunities": [
        "Software Engineer", "Full-Stack Developer", "Senior Developer",
        "Technical Lead", "Solutions Architect", "DevOps Engineer"
    ],
    "difficulty_level": "Intermediate",
    "estimated_learning_time": "3-6 months for proficiency",
    "overall_rating": 8.5,
    "learning_resources": {
        "articles": [
            {"title": "Official Documentation", "url": "https://docs.github.com", "description": "Start with the official docs"},
            {"title": "MDN Web Docs", "url": "https://developer.mozilla.org", "description": "Comprehensive reference"}
        ],
        "tutorials": [
            {"title": "Interactive Tutorial", "url": "https://www.freecodecamp.org", "description": "Hands-on learning"},
            {"title": "Project-Based Learning", "url": "https://www.theodinproject.com", "description": "Build real projects"}
        ],
        "videos": [
            {"title": "Crash Course", "url": "https://www.youtube.com/c/TraversyMedia", "description": "Traversy Media crash course"},
            {"title": "Full Tutorial", "url": "https://www.youtube.com/c/Fireship", "description": "Fireship quick guides"}
        ],
        "courses": [
            {"title": "Udemy Course", "url": "https://www.udemy.com", "description": "Best-selling comprehensive course"},
            {"title": "Coursera Specialization", "url": "https://www.coursera.org", "description": "University-backed certification"}
        ]
    }
}


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = None
        self._configure()

    def _configure(self, api_key: Optional[str] = None):
        key = api_key or self.api_key
        if key and key != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=key)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                return True
            except Exception:
                self.model = None
        return False

    def reconfigure(self, api_key: str):
        self.api_key = api_key
        return self._configure(api_key)

    async def analyze_repository(self, repo_data: dict, api_key: Optional[str] = None) -> dict:
        if api_key:
            self.reconfigure(api_key)

        if not self.model:
            result = DEMO_REPO_RESPONSE.copy()
            # Customize with actual repo data
            repo_name = repo_data.get("repo_name", "Repository")
            owner = repo_data.get("owner", "Owner")
            stars = repo_data.get("stars", 0)
            langs = list(repo_data.get("languages", {}).keys())
            result["project_summary"] = f"{repo_name} by {owner} is a {'popular' if stars > 1000 else 'growing'} repository with {stars:,} stars. " + result["project_summary"]
            if langs:
                result["detected_technologies"] = langs[:8]
            return result

        prompt = self._get_repo_prompt(repo_data)
        try:
            response = self.model.generate_content(prompt)
            return self._parse_gemini_response(response.text)
        except Exception as e:
            result = DEMO_REPO_RESPONSE.copy()
            result["project_summary"] = f"[AI analysis unavailable: {str(e)[:100]}] " + result["project_summary"]
            return result

    async def analyze_topic(self, topic: str, api_key: Optional[str] = None) -> dict:
        if api_key:
            self.reconfigure(api_key)

        if not self.model:
            result = DEMO_TOPIC_RESPONSE.copy()
            result["overview"] = f"{topic} is {result['overview']}"
            return result

        prompt = self._get_topic_prompt(topic)
        try:
            response = self.model.generate_content(prompt)
            return self._parse_gemini_response(response.text)
        except Exception as e:
            result = DEMO_TOPIC_RESPONSE.copy()
            result["overview"] = f"{topic}: {result['overview']}"
            return result

    def _parse_gemini_response(self, response_text: str) -> dict:
        # Remove markdown code blocks if present
        text = response_text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except Exception:
                    pass
            return DEMO_REPO_RESPONSE.copy()

    def _get_repo_prompt(self, repo: dict) -> str:
        langs = ", ".join(list(repo.get("languages", {}).keys())[:10])
        contributors = [c.get("login", "") for c in repo.get("contributors", [])[:5]]
        file_tree_sample = repo.get("file_tree", [])[:30]
        readme_preview = repo.get("readme_content", "")[:1500]

        return f"""You are an expert software architect and GitHub repository analyst.
Analyze the following GitHub repository and return a comprehensive JSON report.

Repository Data:
- Name: {repo.get('repo_name', 'Unknown')}
- Owner: {repo.get('owner', 'Unknown')}
- Description: {repo.get('description', 'No description')}
- Stars: {repo.get('stars', 0):,}
- Forks: {repo.get('forks', 0):,}
- Open Issues: {repo.get('open_issues', 0)}
- Languages: {langs}
- Topics: {', '.join(repo.get('topics', []))}
- License: {repo.get('license_name', 'None')}
- Has Tests: {repo.get('has_tests', False)}
- Has CI/CD: {repo.get('has_ci', False)}
- Has Docker: {repo.get('has_docker', False)}
- Has Docs: {repo.get('has_docs', False)}
- Created: {repo.get('created_at', 'Unknown')}
- Last Updated: {repo.get('updated_at', 'Unknown')}
- Top Contributors: {', '.join(contributors)}
- File Structure Sample: {', '.join(file_tree_sample)}
- README Preview: {readme_preview}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{{
  "project_summary": "2-3 sentence project summary",
  "architecture_assessment": "2-3 sentence architecture evaluation",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4", "strength 5"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "improvement_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"],
  "overall_rating": 8.5,
  "health_assessment": "2 sentence health assessment",
  "complexity_level": "Beginner|Intermediate|Advanced|Expert",
  "learning_difficulty": 6.0,
  "beginner_friendly_score": 7.0,
  "portfolio_value_score": 8.5,
  "detected_technologies": ["React", "Node.js", "etc"],
  "doc_quality_score": 8.0,
  "code_quality_score": 7.5,
  "doc_improvement_suggestions": ["suggestion 1", "suggestion 2"],
  "code_improvement_suggestions": ["suggestion 1", "suggestion 2"],
  "learning_resources": {{
    "articles": [{{"title": "...", "url": "https://...", "description": "..."}}],
    "tutorials": [{{"title": "...", "url": "https://...", "description": "..."}}],
    "videos": [{{"title": "...", "url": "https://...", "description": "..."}}],
    "courses": [{{"title": "...", "url": "https://...", "description": "..."}}]
  }}
}}"""

    def _get_topic_prompt(self, topic: str) -> str:
        return f"""You are an expert technical educator and career counselor.
Create a comprehensive learning guide for: {topic}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{{
  "overview": "3-4 sentence overview of {topic}",
  "learning_roadmap": [
    {{"step": "1", "title": "Step title", "description": "What to learn in this step"}},
    {{"step": "2", "title": "Step title", "description": "What to learn in this step"}},
    {{"step": "3", "title": "Step title", "description": "What to learn in this step"}},
    {{"step": "4", "title": "Step title", "description": "What to learn in this step"}},
    {{"step": "5", "title": "Step title", "description": "What to learn in this step"}},
    {{"step": "6", "title": "Step title", "description": "What to learn in this step"}}
  ],
  "required_skills": ["skill 1", "skill 2", "skill 3", "skill 4"],
  "popular_tools": [
    {{"name": "Tool name", "description": "What it's used for"}},
    {{"name": "Tool name", "description": "What it's used for"}},
    {{"name": "Tool name", "description": "What it's used for"}}
  ],
  "career_opportunities": ["Job title 1", "Job title 2", "Job title 3", "Job title 4", "Job title 5"],
  "difficulty_level": "Beginner|Intermediate|Advanced|Expert",
  "estimated_learning_time": "X-Y months for proficiency",
  "overall_rating": 8.5,
  "detected_technologies": ["{topic}", "related tech 1", "related tech 2"],
  "learning_resources": {{
    "articles": [
      {{"title": "Specific article title", "url": "https://actual-url.com", "description": "What you learn"}}
    ],
    "tutorials": [
      {{"title": "Specific tutorial title", "url": "https://actual-url.com", "description": "What you learn"}}
    ],
    "videos": [
      {{"title": "Specific video title", "url": "https://youtube.com/...", "description": "What you learn"}}
    ],
    "courses": [
      {{"title": "Specific course title", "url": "https://actual-url.com", "description": "What you learn"}}
    ]
  }}
}}"""


gemini_service = GeminiService()
