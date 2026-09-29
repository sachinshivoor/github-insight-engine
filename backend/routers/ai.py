from fastapi import APIRouter, HTTPException
from schemas.analysis import AIAnalysisRequest, AIAnalysisResponse
from services.gemini_service import gemini_service

router = APIRouter()


@router.post("/api/ai/analyze", response_model=AIAnalysisResponse)
async def analyze(request: AIAnalysisRequest):
    try:
        api_key = request.gemini_api_key or None

        if request.analysis_type == "topic" and request.topic:
            result = await gemini_service.analyze_topic(request.topic, api_key=api_key)
        elif request.analysis_type == "repo" and request.repo_data:
            result = await gemini_service.analyze_repository(
                request.repo_data.model_dump(), api_key=api_key
            )
        else:
            raise HTTPException(status_code=400, detail="Must provide either repo_data or topic.")

        # Ensure all required fields have defaults
        defaults = {
            "project_summary": "",
            "architecture_assessment": "",
            "strengths": [],
            "weaknesses": [],
            "improvement_suggestions": [],
            "overall_rating": 7.0,
            "health_assessment": "",
            "complexity_level": "Intermediate",
            "learning_difficulty": 5.0,
            "beginner_friendly_score": 5.0,
            "portfolio_value_score": 7.0,
            "detected_technologies": [],
            "doc_quality_score": 7.0,
            "code_quality_score": 7.0,
            "doc_improvement_suggestions": [],
            "code_improvement_suggestions": [],
            "learning_resources": {"articles": [], "tutorials": [], "videos": [], "courses": []},
            "overview": "",
            "learning_roadmap": [],
            "required_skills": [],
            "popular_tools": [],
            "career_opportunities": [],
            "difficulty_level": "Intermediate",
            "estimated_learning_time": "",
        }
        for key, val in defaults.items():
            if key not in result:
                result[key] = val

        return AIAnalysisResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
