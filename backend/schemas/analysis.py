from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ContributorInfo(BaseModel):
    login: str
    avatar_url: str = ""
    contributions: int = 0
    html_url: str = ""


class CommitInfo(BaseModel):
    sha: str = ""
    message: str = ""
    author: str = ""
    date: str = ""


class RepoData(BaseModel):
    repo_name: str
    owner: str
    description: str = ""
    stars: int = 0
    forks: int = 0
    watchers: int = 0
    open_issues: int = 0
    created_at: str = ""
    updated_at: str = ""
    license_name: str = "None"
    default_branch: str = "main"
    topics: List[str] = []
    languages: Dict[str, float] = {}
    contributors: List[Dict[str, Any]] = []
    recent_commits: List[Dict[str, Any]] = []
    readme_content: str = ""
    file_tree: List[str] = []
    has_tests: bool = False
    has_docs: bool = False
    has_ci: bool = False
    has_docker: bool = False
    size_kb: int = 0
    homepage: str = ""
    is_fork: bool = False
    network_count: int = 0


class LearningResource(BaseModel):
    title: str
    url: str
    description: str = ""
    level: str = "Beginner"


class LearningResources(BaseModel):
    articles: List[LearningResource] = []
    tutorials: List[LearningResource] = []
    videos: List[LearningResource] = []
    courses: List[LearningResource] = []


class DocQualityCheck(BaseModel):
    name: str
    passed: bool
    points: float = 0


class CodeQualityCheck(BaseModel):
    name: str
    passed: bool
    points: float = 0


class AIAnalysisRequest(BaseModel):
    repo_data: Optional[RepoData] = None
    topic: Optional[str] = None
    analysis_type: str = "repo"  # 'repo' or 'topic'
    gemini_api_key: Optional[str] = None


class AIAnalysisResponse(BaseModel):
    project_summary: str = ""
    architecture_assessment: str = ""
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_suggestions: List[str] = []
    overall_rating: float = 7.0
    health_assessment: str = ""
    complexity_level: str = "Intermediate"
    learning_difficulty: float = 5.0
    beginner_friendly_score: float = 5.0
    portfolio_value_score: float = 7.0
    detected_technologies: List[str] = []
    doc_quality_score: float = 7.0
    code_quality_score: float = 7.0
    doc_improvement_suggestions: List[str] = []
    code_improvement_suggestions: List[str] = []
    learning_resources: Dict[str, List[Dict[str, str]]] = {
        "articles": [], "tutorials": [], "videos": [], "courses": []
    }
    # Topic-specific fields
    overview: str = ""
    learning_roadmap: List[Dict[str, str]] = []
    required_skills: List[str] = []
    popular_tools: List[Dict[str, str]] = []
    career_opportunities: List[str] = []
    difficulty_level: str = "Intermediate"
    estimated_learning_time: str = ""


class HistoryItem(BaseModel):
    id: int
    query: str
    query_type: str
    created_at: datetime
    result_summary: Optional[str] = None

    class Config:
        from_attributes = True


class SaveReportRequest(BaseModel):
    title: str
    repo_url: Optional[str] = None
    topic: Optional[str] = None
    report_data: Dict[str, Any]


class SavedReportSummary(BaseModel):
    id: int
    title: str
    repo_url: Optional[str] = None
    topic: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AICompareRequest(BaseModel):
    repo_data_a: RepoData
    repo_data_b: RepoData
    gemini_api_key: Optional[str] = None


class AICompareResponse(BaseModel):
    comparison_summary: str = ""
    architecture_comparison: str = ""
    repo_a_strengths: List[str] = []
    repo_b_strengths: List[str] = []
    repo_a_weaknesses: List[str] = []
    repo_b_weaknesses: List[str] = []
    recommendation: str = ""
    overall_winner: str = ""
