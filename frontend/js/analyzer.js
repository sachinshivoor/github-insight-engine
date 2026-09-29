// Analysis orchestration — coordinates all GitHub API calls and scoring
// GitHub Insight Engine v2.0 — Enhanced Analytics Engine

import { store } from './store.js';
import { githubAPI } from './github.js';

function setStep(step, progress) {
  store.loadingStep = step;
  store.loadingProgress = progress;
}

class Analyzer {
  async analyzeRepo(url) {
    store.isLoading = true;
    store.error = null;
    store.currentView = 'loading';

    try {
      // 1. Parse URL
      setStep('Parsing repository URL…', 5);
      const { owner, repo } = githubAPI.parseRepoUrl(url);

      // 2. Fetch core repo data
      setStep('Fetching repository metadata…', 15);
      const repoData = await githubAPI.getRepo(owner, repo);

      // 3. Languages
      setStep('Analyzing programming languages…', 25);
      const rawLangs = await githubAPI.getLanguages(owner, repo);
      const languages = this._normalizeLanguages(rawLangs);

      // 4. Contributors
      setStep('Loading contributor data…', 35);
      const contributors = await githubAPI.getContributors(owner, repo);

      // 5. Commits
      setStep('Fetching commit history…', 45);
      const commits = await githubAPI.getCommits(owner, repo, 30);
      const commitActivity = await githubAPI.getCommitActivity(owner, repo);

      // 6. File tree
      setStep('Scanning repository structure…', 55);
      const treeItems = await githubAPI.getFileTree(owner, repo, repoData.default_branch);
      const fileTree = treeItems.map(t => t.path);

      // 7. README
      setStep('Evaluating documentation…', 65);
      const readme = await githubAPI.getReadme(owner, repo);

      // 8. Topics
      setStep('Detecting technologies…', 72);
      const topics = await githubAPI.getTopics(owner, repo);

      // 9. Local analysis — full scoring suite
      setStep('Calculating quality scores…', 78);
      const hasTests = this._hasTests(fileTree);
      const hasDocs = this._hasDocs(fileTree);
      const hasCi = this._hasCi(fileTree);
      const hasDocker = this._hasDocker(fileTree);
      const detectedTech = this.detectTechnologies(languages, fileTree, readme, topics);
      const docScore = this.calculateDocScore(readme);
      const codeScore = this.calculateCodeScore(fileTree, languages, hasTests, hasCi, hasDocker);
      const commitStats = this._analyzeCommits(commits, commitActivity);

      // 10. Compute all local scores (these work without AI)
      const localScores = this._computeLocalScores(repoData, languages, contributors, commitActivity, fileTree, readme, hasTests, hasCi, hasDocker, hasDocs);

      // 11. AI Insights
      setStep('Generating AI insights…', 85);
      let aiInsights = null;
      try {
        aiInsights = await this.callBackendAI({
          analysis_type: 'repo',
          repo_data: {
            repo_name: repoData.name,
            owner: repoData.owner?.login || owner,
            description: repoData.description || '',
            stars: repoData.stargazers_count || 0,
            forks: repoData.forks_count || 0,
            watchers: repoData.watchers_count || 0,
            open_issues: repoData.open_issues_count || 0,
            created_at: repoData.created_at || '',
            updated_at: repoData.updated_at || '',
            license_name: repoData.license?.name || 'None',
            default_branch: repoData.default_branch || 'main',
            topics,
            languages,
            contributors: contributors.slice(0, 10).map(c => ({
              login: c.login, contributions: c.contributions
            })),
            recent_commits: commits.slice(0, 5).map(c => ({
              sha: c.sha?.substring(0, 7),
              message: c.commit?.message?.split('\n')[0]?.substring(0, 80),
              author: c.commit?.author?.name,
              date: c.commit?.author?.date,
            })),
            readme_content: readme.substring(0, 2000),
            file_tree: fileTree.slice(0, 50),
            has_tests: hasTests,
            has_docs: hasDocs,
            has_ci: hasCi,
            has_docker: hasDocker,
            size_kb: repoData.size || 0,
          }
        });
      } catch (e) {
        console.warn('AI insights unavailable:', e.message);
      }

      // 12. Merge AI insights with local scores (local scores take priority for accuracy)
      const mergedInsights = this._mergeInsights(aiInsights, localScores, repoData, detectedTech, languages, contributors, readme);

      // 13. Assemble final analysis
      setStep('Assembling report…', 95);
      const analysis = {
        type: 'repo',
        timestamp: new Date().toISOString(),
        repo: {
          name: repoData.name,
          owner: repoData.owner?.login || owner,
          full_name: repoData.full_name,
          description: repoData.description || '',
          stars: repoData.stargazers_count || 0,
          forks: repoData.forks_count || 0,
          watchers: repoData.watchers_count || 0,
          open_issues: repoData.open_issues_count || 0,
          size_kb: repoData.size || 0,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          license: repoData.license?.name || null,
          default_branch: repoData.default_branch || 'main',
          homepage: repoData.homepage || '',
          is_fork: repoData.fork || false,
          html_url: repoData.html_url,
          topics,
          avatar_url: repoData.owner?.avatar_url || '',
          subscribers_count: repoData.subscribers_count || 0,
          network_count: repoData.network_count || 0,
        },
        languages,
        contributors: contributors.slice(0, 10).map(c => ({
          login: c.login,
          avatar_url: c.avatar_url,
          contributions: c.contributions,
          html_url: c.html_url,
        })),
        commits: commits.slice(0, 10).map(c => ({
          sha: c.sha?.substring(0, 7),
          message: c.commit?.message?.split('\n')[0]?.substring(0, 80),
          author: c.commit?.author?.name,
          date: c.commit?.author?.date,
          url: c.html_url,
        })),
        commitActivity,
        commitStats,
        fileTree: fileTree.slice(0, 200),
        structure: {
          hasTests, hasDocs, hasCi, hasDocker,
          hasSrc: fileTree.some(f => f.startsWith('src/')),
          hasPackageJson: fileTree.includes('package.json'),
          hasRequirements: fileTree.includes('requirements.txt'),
          hasDockerfile: fileTree.some(f => f.toLowerCase() === 'dockerfile'),
          hasReadme: fileTree.some(f => f.toLowerCase() === 'readme.md'),
          hasGitignore: fileTree.includes('.gitignore'),
          hasLicense: fileTree.some(f => f.toLowerCase().startsWith('license')),
          fileCount: fileTree.length,
        },
        docScore,
        codeScore,
        localScores,
        detectedTech,
        aiInsights: mergedInsights,
      };

      // 14. Save to history
      setStep('Saving to history…', 98);
      await this.saveToHistory(url, 'repo', JSON.stringify({
        name: repoData.full_name,
        stars: repoData.stargazers_count,
        description: repoData.description?.substring(0, 100),
      }));

      setStep('Complete!', 100);
      store.isLoading = false;
      return analysis;

    } catch (error) {
      store.isLoading = false;
      store.error = error.message;
      throw error;
    }
  }

  async analyzeTopic(topic) {
    store.isLoading = true;
    store.error = null;
    store.currentView = 'loading';

    try {
      setStep('Preparing topic analysis…', 20);
      await new Promise(r => setTimeout(r, 300));

      setStep('Generating AI insights for ' + topic + '…', 50);
      let topicData = null;
      try {
        topicData = await this.callBackendAI({
          analysis_type: 'topic',
          topic,
        });
      } catch (e) {
        console.warn('Backend AI unavailable:', e.message);
        topicData = this._getFallbackTopicData(topic);
      }

      setStep('Saving to history…', 90);
      await this.saveToHistory(topic, 'topic', JSON.stringify({
        overview: topicData?.overview?.substring(0, 100),
        difficulty: topicData?.difficulty_level,
      }));

      setStep('Complete!', 100);
      store.isLoading = false;

      return {
        type: 'topic',
        topic,
        timestamp: new Date().toISOString(),
        ...topicData,
      };
    } catch (error) {
      store.isLoading = false;
      store.error = error.message;
      throw error;
    }
  }

  // ─── Local Scoring Engine ─────────────────────────────────────────────────

  _computeLocalScores(repoData, languages, contributors, commitActivity, fileTree, readme, hasTests, hasCi, hasDocker, hasDocs) {
    const stars = repoData.stargazers_count || 0;
    const forks = repoData.forks_count || 0;
    const openIssues = repoData.open_issues_count || 0;
    const watchers = repoData.subscribers_count || repoData.watchers_count || 0;
    const sizeKb = repoData.size || 0;

    // --- Community Score (0-100) ---
    // Based on stars, forks, watchers, network
    const starScore = Math.min(40, Math.log10(Math.max(stars, 1)) * 14);
    const forkScore = Math.min(30, Math.log10(Math.max(forks, 1)) * 11);
    const watcherScore = Math.min(20, Math.log10(Math.max(watchers, 1)) * 8);
    const contribScore = Math.min(10, (contributors.length / 5) * 10);
    const communityScore = Math.round(starScore + forkScore + watcherScore + contribScore);

    // --- Activity Score (0-100) ---
    // Based on commit activity in last 52 weeks
    const weeklyTotals = (commitActivity || []).map(w => w?.total || 0);
    const totalCommits = weeklyTotals.reduce((s, v) => s + v, 0);
    const recentCommits = weeklyTotals.slice(-8).reduce((s, v) => s + v, 0);
    const hasRecentActivity = recentCommits > 0;
    const avgWeekly = weeklyTotals.length ? totalCommits / weeklyTotals.length : 0;

    const daysSinceUpdate = repoData.updated_at
      ? Math.floor((Date.now() - new Date(repoData.updated_at).getTime()) / 86400000)
      : 999;

    let activityScore = 0;
    // Recent commits (last 8 weeks)
    activityScore += Math.min(40, (recentCommits / 2) * 4);
    // Annual commit volume
    activityScore += Math.min(30, Math.log10(Math.max(totalCommits, 1)) * 11);
    // Recency bonus
    if (daysSinceUpdate < 7) activityScore += 30;
    else if (daysSinceUpdate < 30) activityScore += 22;
    else if (daysSinceUpdate < 90) activityScore += 14;
    else if (daysSinceUpdate < 180) activityScore += 6;
    activityScore = Math.round(Math.min(100, activityScore));

    // --- Documentation Score (0-100) ---
    let docScore100 = 0;
    if (readme.length > 100) docScore100 += 20;
    if (readme.length > 500) docScore100 += 10;
    if (/^#\s+.+/m.test(readme)) docScore100 += 10;
    if (/install|setup|getting started/i.test(readme)) docScore100 += 15;
    if (/usage|how to use|example|demo/i.test(readme)) docScore100 += 15;
    if (/```/.test(readme)) docScore100 += 10;
    if (/!\[.*\]\(.*\)/i.test(readme) || /screenshot|preview/i.test(readme)) docScore100 += 5;
    if (/contribut/i.test(readme)) docScore100 += 5;
    if (/license/i.test(readme)) docScore100 += 5;
    if (hasDocs) docScore100 += 5;
    docScore100 = Math.min(100, docScore100);

    // --- Code Quality Score (0-100) ---
    let codeQualityScore = 0;
    if (hasTests) codeQualityScore += 25;
    if (hasCi) codeQualityScore += 20;
    if (hasDocker) codeQualityScore += 10;
    if (fileTree.includes('.gitignore')) codeQualityScore += 8;
    if (fileTree.some(f => f.toLowerCase().startsWith('license'))) codeQualityScore += 7;
    if (fileTree.some(f => f.startsWith('src/'))) codeQualityScore += 8;
    if (fileTree.some(f => f.startsWith('docs/'))) codeQualityScore += 7;
    if (Object.keys(languages).length >= 2) codeQualityScore += 5;
    // Structure check — well-organized root
    const rootFiles = fileTree.filter(f => !f.includes('/'));
    if (rootFiles.length < 20) codeQualityScore += 5;
    if (rootFiles.length < 10) codeQualityScore += 5;
    codeQualityScore = Math.min(100, codeQualityScore);

    // --- Maintainability Score (0-100) ---
    let maintScore = 0;
    maintScore += hasCi ? 25 : 0;
    maintScore += hasTests ? 25 : 0;
    maintScore += fileTree.includes('.gitignore') ? 10 : 0;
    maintScore += fileTree.some(f => f.toLowerCase().startsWith('license')) ? 10 : 0;
    maintScore += openIssues < 10 ? 15 : openIssues < 50 ? 10 : openIssues < 200 ? 5 : 0;
    maintScore += daysSinceUpdate < 30 ? 15 : daysSinceUpdate < 90 ? 10 : daysSinceUpdate < 180 ? 5 : 0;
    maintScore = Math.min(100, maintScore);

    // --- Portfolio Value Score (0-100) ---
    let portfolioScore = 0;
    // Stars indicate real-world recognition
    portfolioScore += Math.min(30, Math.log10(Math.max(stars, 1)) * 11);
    // Good code practices
    portfolioScore += hasTests ? 15 : 0;
    portfolioScore += hasCi ? 10 : 0;
    portfolioScore += hasDocker ? 8 : 0;
    // Documentation
    portfolioScore += docScore100 * 0.2;
    // Multiple languages = polyglot
    portfolioScore += Math.min(10, Object.keys(languages).length * 2);
    // Tech diversity
    portfolioScore += Math.min(10, (contributors.length > 5 ? 10 : contributors.length * 2));
    portfolioScore = Math.round(Math.min(100, portfolioScore));

    // --- Beginner Friendliness Score (0-100) ---
    let beginnerScore = 50; // baseline
    // Good docs help beginners
    beginnerScore += docScore100 * 0.2;
    // Small/medium repos easier to understand
    if (fileTree.length < 50) beginnerScore += 15;
    else if (fileTree.length < 150) beginnerScore += 8;
    else if (fileTree.length > 500) beginnerScore -= 10;
    // License shows openness
    if (fileTree.some(f => f.toLowerCase().startsWith('license'))) beginnerScore += 5;
    // Too many open issues can be intimidating
    if (openIssues > 1000) beginnerScore -= 10;
    beginnerScore = Math.round(Math.min(100, Math.max(0, beginnerScore)));

    // --- Learning Difficulty (0-100, higher = harder) ---
    let difficultyScore = 30; // baseline
    if (fileTree.length > 300) difficultyScore += 20;
    else if (fileTree.length > 100) difficultyScore += 10;
    if (Object.keys(languages).length > 5) difficultyScore += 15;
    if (sizeKb > 100000) difficultyScore += 15; // very large repo
    else if (sizeKb > 10000) difficultyScore += 8;
    difficultyScore = Math.round(Math.min(100, difficultyScore));

    // Complexity label based on difficulty
    let complexityLevel = 'Beginner';
    if (difficultyScore >= 75) complexityLevel = 'Expert';
    else if (difficultyScore >= 55) complexityLevel = 'Advanced';
    else if (difficultyScore >= 35) complexityLevel = 'Intermediate';

    // --- Overall Score (0-100) ---
    const overallScore = Math.round(
      communityScore * 0.25 +
      activityScore * 0.20 +
      docScore100 * 0.15 +
      codeQualityScore * 0.20 +
      maintScore * 0.10 +
      portfolioScore * 0.10
    );

    return {
      overallScore,
      communityScore,
      activityScore,
      documentationScore: docScore100,
      codeQualityScore,
      maintainabilityScore: maintScore,
      portfolioValueScore: portfolioScore,
      beginnerFriendlyScore: beginnerScore,
      learningDifficulty: difficultyScore,
      complexityLevel,
      // Derived metrics for display
      weeklyAvgCommits: Math.round(avgWeekly * 10) / 10,
      totalAnnualCommits: totalCommits,
      daysSinceUpdate,
    };
  }

  // ─── Merge AI + Local Insights ─────────────────────────────────────────────

  _mergeInsights(aiInsights, localScores, repoData, detectedTech, languages, contributors, readme) {
    const stars = repoData.stargazers_count || 0;
    const forks = repoData.forks_count || 0;
    const name = repoData.full_name || repoData.name;

    // If AI gave us good data, enhance it with local scores
    if (aiInsights && aiInsights.project_summary && aiInsights.project_summary.length > 50) {
      return {
        ...aiInsights,
        // Override scores with locally-computed accurate values
        overall_rating: parseFloat((localScores.overallScore / 10).toFixed(1)),
        portfolio_value_score: parseFloat((localScores.portfolioValueScore / 10).toFixed(1)),
        beginner_friendly_score: parseFloat((localScores.beginnerFriendlyScore / 10).toFixed(1)),
        learning_difficulty: parseFloat((localScores.learningDifficulty / 10).toFixed(1)),
        complexity_level: localScores.complexityLevel,
        // Local scores (0-100 scale)
        localScores,
        detected_technologies: detectedTech,
      };
    }

    // Generate comprehensive fallback insights from real data
    return this._generateLocalInsights(localScores, repoData, detectedTech, languages, contributors, readme);
  }

  _generateLocalInsights(localScores, repoData, detectedTech, languages, contributors, readme) {
    const stars = repoData.stargazers_count || 0;
    const forks = repoData.forks_count || 0;
    const name = repoData.name || 'this project';
    const fullName = repoData.full_name || name;
    const owner = repoData.owner?.login || '';
    const desc = repoData.description || '';
    const langList = Object.keys(languages).slice(0, 4).join(', ') || 'multiple languages';
    const topContrib = contributors.slice(0, 3).map(c => c.login).join(', ') || 'contributors';
    const { complexityLevel, overallScore, codeQualityScore, activityScore, communityScore } = localScores;

    // Project summary
    const popularityLabel = stars > 10000 ? 'highly popular' : stars > 1000 ? 'well-known' : stars > 100 ? 'growing' : 'emerging';
    const projectSummary = `${fullName} is a ${popularityLabel} open-source project${desc ? ' — ' + desc.charAt(0).toLowerCase() + desc.slice(1) : ''}. With ${stars.toLocaleString()} stars and ${forks.toLocaleString()} forks, it demonstrates strong community adoption. The project is primarily built with ${langList} and shows ${activityScore > 60 ? 'high' : activityScore > 30 ? 'moderate' : 'low'} development activity.`;

    // Architecture assessment
    const archAssessment = `The ${name} repository follows a ${localScores.codeQualityScore > 70 ? 'well-structured' : 'functional'} architecture. ${localScores.maintainabilityScore > 70 ? 'It demonstrates strong engineering practices with CI/CD pipelines, automated testing, and containerization support. ' : ''}The codebase is organized with ${Object.keys(languages).length} programming language(s), indicating ${Object.keys(languages).length > 3 ? 'a polyglot, multi-component system' : 'a focused technology stack'}. ${contributors.length > 5 ? `The ${contributors.length}-person contributor base suggests a mature, collaborative development model.` : 'The project has a small, focused contributor team.'}`;

    // Strengths
    const strengths = [];
    if (stars > 1000) strengths.push(`Strong community validation with ${stars.toLocaleString()} GitHub stars`);
    if (forks > 500) strengths.push(`Active ecosystem with ${forks.toLocaleString()} forks indicating real-world adoption`);
    if (localScores.maintainabilityScore > 60) strengths.push('Strong engineering practices with CI/CD and automated testing');
    if (contributors.length > 5) strengths.push(`Diverse contributor base with ${contributors.length}+ active contributors`);
    if (localScores.documentationScore > 60) strengths.push('Well-documented codebase with clear installation and usage guides');
    if (readme.length > 1000) strengths.push('Comprehensive README with detailed project information');
    if (detectedTech.length > 5) strengths.push(`Rich technology ecosystem leveraging ${detectedTech.slice(0, 4).join(', ')} and more`);
    if (activityScore > 50) strengths.push('Active maintenance with regular commits and updates');
    if (localScores.codeQualityScore > 60) strengths.push('Good project structure with proper file organization');
    if (repoData.license?.name) strengths.push(`Open-source with ${repoData.license.name} license enabling free usage`);
    // Ensure at least 4 strengths
    while (strengths.length < 4) {
      const extras = [
        'Available on GitHub with full source code access',
        'Good starting point for learning modern development patterns',
        'Demonstrates real-world application architecture',
        'Suitable for portfolio showcasing and skill demonstration',
      ];
      strengths.push(extras[strengths.length - 4] || extras[0]);
    }

    // Weaknesses
    const weaknesses = [];
    if (localScores.documentationScore < 50) weaknesses.push('Documentation could be more comprehensive with better examples');
    if (!localScores.codeQualityScore || localScores.codeQualityScore < 40) weaknesses.push('Limited automated testing reduces confidence in code reliability');
    if (activityScore < 30) weaknesses.push('Low recent commit activity may indicate reduced maintenance');
    if (repoData.open_issues_count > 200) weaknesses.push(`${repoData.open_issues_count} open issues indicates potential backlog and maintenance debt`);
    if (Object.keys(languages).length === 1) weaknesses.push('Single-language codebase may limit technology learning diversity');
    if (contributors.length < 3) weaknesses.push('Small contributor base increases key-person dependency risk');
    while (weaknesses.length < 3) {
      const extras = [
        'Could benefit from more contribution guidelines and onboarding documentation',
        'API documentation could be more detailed and structured',
        'Performance benchmarks and comparison metrics are not included',
        'More extensive integration tests would improve reliability guarantees',
      ];
      weaknesses.push(extras[weaknesses.length] || extras[0]);
    }

    // Improvement suggestions
    const improvements = [
      hasNoTests => hasNoTests ? 'Add comprehensive unit and integration tests to reach 80%+ coverage' : 'Expand test coverage with end-to-end and performance tests',
      'Create detailed API documentation with usage examples and interactive demos',
      'Add CONTRIBUTING.md with clear guidelines for new contributors',
      'Implement semantic versioning and maintain a CHANGELOG.md',
      'Add badges to README (build status, coverage, version, license)',
      'Create GitHub issue templates to standardize bug reports and feature requests',
    ].map(s => typeof s === 'function' ? s(!localScores.codeQualityScore || localScores.codeQualityScore < 40) : s);

    // Health assessment
    const healthLabel = overallScore >= 80 ? 'Excellent' : overallScore >= 65 ? 'Good' : overallScore >= 45 ? 'Fair' : 'Needs Attention';
    const healthAssessment = `Repository health is ${healthLabel} (${overallScore}/100). ${activityScore > 50 ? 'Active development with regular commits shows the project is well-maintained.' : 'Limited recent activity suggests the project may be in maintenance mode.'} ${communityScore > 50 ? 'Strong community engagement with significant stars and forks.' : 'The community is still growing.'} ${localScores.maintainabilityScore > 60 ? 'Good engineering practices support long-term sustainability.' : 'Improving CI/CD and testing would enhance long-term maintainability.'}`;

    // Learning resources (curated based on detected tech)
    const resources = this._generateLearningResources(detectedTech, languages, name, fullName);

    // Career relevance
    const topTechs = detectedTech.slice(0, 3).join(', ') || langList;
    const careerRelevance = `Working with ${topTechs} is highly valuable in today's job market. Studying ${name} provides hands-on experience with production-grade code used by industry leaders. Developers familiar with these technologies command competitive salaries, with roles including Software Engineer, Full-Stack Developer, and ${localScores.learningDifficulty > 60 ? 'Senior Engineer / Architect' : 'Mid-level Developer'}.`;

    // Best suitable for
    const bestFor = [];
    if (localScores.beginnerFriendlyScore > 60) bestFor.push('Beginners looking to study real-world code');
    bestFor.push('Students building portfolio projects');
    bestFor.push(`Developers learning ${langList}`);
    if (stars > 5000) bestFor.push('Professionals studying industry-standard implementations');
    if (contributors.length > 10) bestFor.push('Open-source contributors seeking active communities');
    bestFor.push('Academic project reference and inspiration');

    return {
      project_summary: projectSummary,
      architecture_assessment: archAssessment,
      strengths,
      weaknesses,
      improvement_suggestions: improvements,
      overall_rating: parseFloat((localScores.overallScore / 10).toFixed(1)),
      health_assessment: healthAssessment,
      complexity_level: complexityLevel,
      learning_difficulty: parseFloat((localScores.learningDifficulty / 10).toFixed(1)),
      beginner_friendly_score: parseFloat((localScores.beginnerFriendlyScore / 10).toFixed(1)),
      portfolio_value_score: parseFloat((localScores.portfolioValueScore / 10).toFixed(1)),
      detected_technologies: detectedTech,
      doc_quality_score: parseFloat((localScores.documentationScore / 10).toFixed(1)),
      code_quality_score: parseFloat((localScores.codeQualityScore / 10).toFixed(1)),
      doc_improvement_suggestions: [
        'Add visual screenshots or animated GIFs demonstrating key features',
        'Include a Quick Start section with minimal setup steps',
        'Add architecture diagram explaining system components',
        'Include FAQ section addressing common issues',
      ],
      code_improvement_suggestions: [
        'Implement automated linting and code formatting in CI pipeline',
        'Add type annotations or TypeScript for better IDE support',
        'Create comprehensive API documentation with examples',
        'Add performance benchmarks and profiling guides',
      ],
      learning_resources: resources,
      career_relevance: careerRelevance,
      best_suitable_for: bestFor,
      localScores,
    };
  }

  _generateLearningResources(detectedTech, languages, repoName, fullName) {
    const primaryLang = Object.keys(languages)[0] || '';
    const hasPython = detectedTech.includes('Python') || primaryLang === 'Python';
    const hasJS = detectedTech.includes('JavaScript') || detectedTech.includes('TypeScript') || primaryLang === 'JavaScript' || primaryLang === 'TypeScript';
    const hasReact = detectedTech.includes('React');
    const hasNode = detectedTech.includes('Node.js');
    const hasDocker = detectedTech.includes('Docker');
    const hasTS = detectedTech.includes('TypeScript') || primaryLang === 'TypeScript';

    const articles = [
      { title: 'GitHub Repository Best Practices Guide', url: 'https://docs.github.com/en/repositories', description: 'Official GitHub documentation on repository management and best practices' },
      { title: 'Open Source Contribution Guide', url: 'https://opensource.guide/how-to-contribute/', description: 'Learn how to effectively contribute to open-source projects' },
    ];

    const tutorials = [
      { title: 'Git & GitHub Crash Course', url: 'https://www.freecodecamp.org/news/git-and-github-for-beginners/', description: 'Complete beginner guide to version control with Git and GitHub' },
    ];

    const videos = [
      { title: 'GitHub Explained — Traversy Media', url: 'https://www.youtube.com/c/TraversyMedia', description: 'Practical GitHub tutorials by one of the best tech educators' },
    ];

    const courses = [
      { title: 'The Complete Developer Course', url: 'https://www.udemy.com', description: 'Comprehensive course covering modern web development practices' },
    ];

    if (hasPython) {
      articles.push({ title: 'Python Official Documentation', url: 'https://docs.python.org/3/', description: 'Comprehensive Python language reference and standard library docs' });
      tutorials.push({ title: 'Python for Beginners — Real Python', url: 'https://realpython.com', description: 'In-depth Python tutorials with real-world project examples' });
      videos.push({ title: 'Python Full Course — freeCodeCamp', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', description: '4-hour Python crash course covering all fundamentals' });
      courses.push({ title: 'Python Bootcamp — Udemy', url: 'https://www.udemy.com/course/complete-python-bootcamp/', description: 'Best-selling Python course with 100+ hours of content' });
    }

    if (hasJS || hasTS) {
      articles.push({ title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', description: 'Comprehensive JavaScript reference from Mozilla Developer Network' });
      tutorials.push({ title: 'JavaScript.info', url: 'https://javascript.info', description: 'Modern JavaScript tutorial from basics to advanced topics' });
    }

    if (hasTS) {
      articles.push({ title: 'TypeScript Official Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', description: 'Complete TypeScript language guide with examples' });
      courses.push({ title: 'Understanding TypeScript — Udemy', url: 'https://www.udemy.com/course/understanding-typescript/', description: 'Deep dive into TypeScript with real projects' });
    }

    if (hasReact) {
      articles.push({ title: 'React Official Documentation', url: 'https://react.dev', description: 'The new official React docs with interactive examples' });
      tutorials.push({ title: 'React Tutorial — Scrimba', url: 'https://scrimba.com/learn/learnreact', description: 'Interactive React course with hands-on coding exercises' });
      videos.push({ title: 'React Full Course 2024 — Bro Code', url: 'https://www.youtube.com/watch?v=CgkZ7MvWUAA', description: 'Complete React tutorial for beginners' });
      courses.push({ title: 'React — The Complete Guide — Udemy', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', description: 'Comprehensive React course with hooks, context, and Redux' });
    }

    if (hasNode) {
      tutorials.push({ title: 'Node.js Official Getting Started', url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs', description: 'Official Node.js tutorial for beginners' });
      videos.push({ title: 'Node.js Crash Course — Traversy Media', url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', description: 'Comprehensive Node.js crash course for beginners' });
    }

    if (hasDocker) {
      articles.push({ title: 'Docker Official Documentation', url: 'https://docs.docker.com', description: 'Complete Docker documentation with tutorials and reference' });
      videos.push({ title: 'Docker Tutorial for Beginners — TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', description: 'Best-rated Docker tutorial covering containers and compose' });
    }

    // Ensure variety
    while (articles.length < 3) articles.push({ title: 'GitHub Learning Lab', url: 'https://skills.github.com/', description: 'Interactive GitHub courses and hands-on labs' });
    while (tutorials.length < 3) tutorials.push({ title: 'The Odin Project', url: 'https://www.theodinproject.com', description: 'Free, open-source full-stack curriculum with projects' });
    while (videos.length < 2) videos.push({ title: 'Fireship — Tech Explainers', url: 'https://www.youtube.com/c/Fireship', description: 'Fast-paced, engaging technology explanations and tutorials' });
    while (courses.length < 2) courses.push({ title: 'Coursera — Specializations', url: 'https://www.coursera.org', description: 'University-backed online courses with certifications' });

    return { articles, tutorials, videos, courses };
  }

  _getFallbackTopicData(topic) {
    return {
      overview: `${topic} is a key technology area in modern software development with growing industry demand and a vibrant ecosystem. Mastering ${topic} opens doors to numerous career opportunities across diverse industries.`,
      learning_roadmap: [
        { step: '1', title: 'Foundations', description: `Master core ${topic} concepts, syntax, and fundamental principles through hands-on exercises` },
        { step: '2', title: 'Core Concepts', description: 'Deep dive into essential patterns, data structures, and best practices used in real projects' },
        { step: '3', title: 'Practical Projects', description: 'Build 3-5 real projects to solidify your knowledge and create portfolio pieces' },
        { step: '4', title: 'Advanced Patterns', description: 'Explore performance optimization, design patterns, and advanced architectural concepts' },
        { step: '5', title: 'Ecosystem & Tools', description: 'Master the surrounding tools, frameworks, libraries, and development workflows' },
        { step: '6', title: 'Production Readiness', description: 'Learn deployment, monitoring, security, and maintaining production-grade systems' },
      ],
      required_skills: ['Programming Fundamentals', 'Problem Solving & Algorithms', 'Version Control (Git)', 'Command Line Proficiency', 'Debugging & Testing'],
      popular_tools: [
        { name: 'VS Code', description: 'Industry-standard code editor with powerful extensions and IntelliSense' },
        { name: 'Git & GitHub', description: 'Version control and collaboration platform used by 100M+ developers' },
        { name: 'Docker', description: 'Containerization platform ensuring consistent development environments' },
        { name: 'Postman', description: 'API development and testing tool widely used in professional workflows' },
      ],
      career_opportunities: ['Software Engineer', 'Full-Stack Developer', 'Senior Developer / Tech Lead', 'Solutions Architect', 'DevOps Engineer', 'Freelance Consultant'],
      difficulty_level: 'Intermediate',
      estimated_learning_time: '3-6 months for proficiency',
      overall_rating: 8.5,
      detected_technologies: [topic, 'Git', 'GitHub', 'Docker'],
      learning_resources: {
        articles: [
          { title: 'Official Documentation', url: 'https://developer.mozilla.org', description: 'Start with official documentation for accurate, up-to-date information' },
          { title: 'GitHub Skills', url: 'https://skills.github.com', description: 'Interactive hands-on courses directly on GitHub' },
          { title: 'DEV Community', url: 'https://dev.to', description: 'Thousands of community-written articles and tutorials' },
        ],
        tutorials: [
          { title: 'freeCodeCamp', url: 'https://www.freecodecamp.org', description: 'Free, comprehensive curriculum with certifications' },
          { title: 'The Odin Project', url: 'https://www.theodinproject.com', description: 'Project-based open-source full-stack curriculum' },
          { title: 'Scrimba', url: 'https://scrimba.com', description: 'Interactive coding environment with embedded tutorials' },
        ],
        videos: [
          { title: 'Traversy Media', url: 'https://www.youtube.com/c/TraversyMedia', description: 'Practical crash courses and project-based tutorials' },
          { title: 'Fireship', url: 'https://www.youtube.com/c/Fireship', description: 'Fast-paced, engaging tech concept explanations' },
          { title: 'freeCodeCamp YouTube', url: 'https://www.youtube.com/c/FreeCodeCamp', description: 'Full-length courses and tutorials for free' },
        ],
        courses: [
          { title: 'Udemy — Top Rated Courses', url: 'https://www.udemy.com', description: 'Best-selling comprehensive courses with lifetime access' },
          { title: 'Coursera Specializations', url: 'https://www.coursera.org', description: 'University-backed certifications from Stanford, Google, Meta' },
        ],
      },
    };
  }

  detectTechnologies(languages, fileTree, readme, topics = []) {
    const tech = new Set();
    const readmeLower = (readme || '').toLowerCase();
    const treeSet = new Set(fileTree.map(f => f.toLowerCase()));

    // Languages
    Object.keys(languages || {}).forEach(lang => tech.add(lang));

    // File-based detection
    const fileSignals = {
      'package.json': ['Node.js'],
      'package-lock.json': ['npm'],
      'yarn.lock': ['Yarn'],
      'pnpm-lock.yaml': ['pnpm'],
      'requirements.txt': ['Python'],
      'pipfile': ['Python', 'Pipenv'],
      'poetry.lock': ['Python', 'Poetry'],
      'pyproject.toml': ['Python'],
      'gemfile': ['Ruby'],
      'pom.xml': ['Java', 'Maven'],
      'build.gradle': ['Java', 'Gradle'],
      'cargo.toml': ['Rust'],
      'go.mod': ['Go'],
      'composer.json': ['PHP', 'Composer'],
      'mix.exs': ['Elixir'],
      'pubspec.yaml': ['Dart', 'Flutter'],
      'dockerfile': ['Docker'],
      'docker-compose.yml': ['Docker', 'Docker Compose'],
      'docker-compose.yaml': ['Docker', 'Docker Compose'],
      'kubernetes': ['Kubernetes'],
      'k8s': ['Kubernetes'],
      'terraform': ['Terraform'],
      '.github/workflows': ['GitHub Actions'],
      '.gitlab-ci.yml': ['GitLab CI'],
      'jenkinsfile': ['Jenkins'],
      '.travis.yml': ['Travis CI'],
      'webpack.config.js': ['Webpack'],
      'vite.config.js': ['Vite'],
      'vite.config.ts': ['Vite'],
      'next.config.js': ['Next.js'],
      'next.config.ts': ['Next.js'],
      'nuxt.config.js': ['Nuxt.js'],
      'angular.json': ['Angular'],
      'svelte.config.js': ['Svelte'],
      'tailwind.config.js': ['Tailwind CSS'],
      'tailwind.config.ts': ['Tailwind CSS'],
      '.eslintrc': ['ESLint'],
      'jest.config.js': ['Jest'],
      'vitest.config.js': ['Vitest'],
      'prisma': ['Prisma'],
      'drizzle.config': ['Drizzle ORM'],
      'mongodb': ['MongoDB'],
    };

    for (const [file, technologies] of Object.entries(fileSignals)) {
      if (treeSet.has(file) || [...treeSet].some(f => f.includes(file))) {
        technologies.forEach(t => tech.add(t));
      }
    }

    // README-based detection
    const readmeSignals = {
      'react': 'React', 'vue': 'Vue.js', 'angular': 'Angular', 'svelte': 'Svelte',
      'next.js': 'Next.js', 'nuxt': 'Nuxt.js', 'gatsby': 'Gatsby',
      'node.js': 'Node.js', 'nodejs': 'Node.js', 'express': 'Express',
      'fastapi': 'FastAPI', 'django': 'Django', 'flask': 'Flask',
      'spring boot': 'Spring Boot', 'laravel': 'Laravel', 'rails': 'Ruby on Rails',
      'postgresql': 'PostgreSQL', 'mysql': 'MySQL', 'mongodb': 'MongoDB',
      'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
      'graphql': 'GraphQL', 'rest api': 'REST API',
      'kubernetes': 'Kubernetes', 'terraform': 'Terraform',
      'aws': 'AWS', 'azure': 'Azure', 'gcp': 'Google Cloud',
      'tailwind': 'Tailwind CSS', 'bootstrap': 'Bootstrap',
      'pytorch': 'PyTorch', 'tensorflow': 'TensorFlow', 'scikit-learn': 'scikit-learn',
      'webpack': 'Webpack', 'vite': 'Vite', 'babel': 'Babel',
      'jest': 'Jest', 'mocha': 'Mocha', 'pytest': 'pytest',
      'typescript': 'TypeScript',
    };

    for (const [keyword, technology] of Object.entries(readmeSignals)) {
      if (readmeLower.includes(keyword)) tech.add(technology);
    }

    // Topics
    topics.forEach(t => tech.add(t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())));

    return [...tech].slice(0, 20);
  }

  calculateDocScore(readme) {
    const checks = [
      { name: 'Project title / header', points: 1, passed: /^#\s+.+/m.test(readme) },
      { name: 'Project description', points: 1, passed: readme.length > 200 },
      { name: 'Installation instructions', points: 2, passed: /install|setup|getting started/i.test(readme) },
      { name: 'Usage guide', points: 2, passed: /usage|how to use|example|demo/i.test(readme) },
      { name: 'Screenshots or images', points: 1, passed: /!\[.*\]\(.*\)/i.test(readme) || /screenshot|preview/i.test(readme) },
      { name: 'Code examples', points: 1, passed: /```/.test(readme) },
      { name: 'Contributing guidelines', points: 1, passed: /contribut/i.test(readme) },
      { name: 'License section', points: 1, passed: /license|mit|apache|gpl/i.test(readme) },
    ];
    const total = checks.reduce((s, c) => s + c.points, 0);
    const earned = checks.filter(c => c.passed).reduce((s, c) => s + c.points, 0);
    return { score: parseFloat(((earned / total) * 10).toFixed(1)), max: 10, checks };
  }

  calculateCodeScore(fileTree, languages, hasTests, hasCi, hasDocker) {
    const checks = [
      { name: 'Test directory present', points: 2, passed: hasTests },
      { name: 'CI/CD configuration', points: 2, passed: hasCi },
      { name: 'Docker support', points: 1, passed: hasDocker },
      { name: 'Docs directory', points: 1, passed: fileTree.some(f => f.startsWith('docs/') || f.startsWith('documentation/')) },
      { name: 'Source directory (src/)', points: 1, passed: fileTree.some(f => f.startsWith('src/')) },
      { name: '.gitignore present', points: 1, passed: fileTree.includes('.gitignore') },
      { name: 'License file', points: 1, passed: fileTree.some(f => f.toLowerCase().startsWith('license')) },
      { name: 'Multi-language project', points: 1, passed: Object.keys(languages || {}).length >= 2 },
    ];
    const total = checks.reduce((s, c) => s + c.points, 0);
    const earned = checks.filter(c => c.passed).reduce((s, c) => s + c.points, 0);
    return { score: parseFloat(((earned / total) * 10).toFixed(1)), max: 10, checks };
  }

  _normalizeLanguages(rawLangs) {
    const total = Object.values(rawLangs).reduce((s, v) => s + v, 0);
    if (total === 0) return {};
    const result = {};
    Object.entries(rawLangs).forEach(([lang, bytes]) => {
      result[lang] = parseFloat(((bytes / total) * 100).toFixed(1));
    });
    return result;
  }

  _hasTests(fileTree) {
    return fileTree.some(f =>
      f.startsWith('test/') || f.startsWith('tests/') || f.startsWith('__tests__/') ||
      f.startsWith('spec/') || f.includes('.test.') || f.includes('.spec.')
    );
  }

  _hasDocs(fileTree) {
    return fileTree.some(f => f.startsWith('docs/') || f.startsWith('documentation/') || f.startsWith('wiki/'));
  }

  _hasCi(fileTree) {
    return fileTree.some(f =>
      f.startsWith('.github/workflows/') || f === '.travis.yml' ||
      f === 'Jenkinsfile' || f === '.gitlab-ci.yml' || f === '.circleci/config.yml'
    );
  }

  _hasDocker(fileTree) {
    return fileTree.some(f =>
      f.toLowerCase() === 'dockerfile' || f === 'docker-compose.yml' || f === 'docker-compose.yaml'
    );
  }

  _analyzeCommits(commits, activity) {
    const total = commits.length;
    const weeklyTotal = (activity || []).reduce((s, w) => s + (w?.total || 0), 0);
    const recentWeeks = (activity || []).slice(-4).reduce((s, w) => s + (w?.total || 0), 0);
    return {
      recentCount: total,
      weeklyAvg: activity?.length ? Math.round(weeklyTotal / activity.length) : 0,
      lastMonthTotal: recentWeeks,
      lastCommitDate: commits[0]?.commit?.author?.date || null,
    };
  }

  async callBackendAI(payload) {
    const backendUrl = store.backendUrl || 'http://localhost:8000';
    const body = { ...payload };
    if (store.geminiApiKey) body.gemini_api_key = store.geminiApiKey;

    const headers = { 'Content-Type': 'application/json' };
    if (store.authToken) {
      headers['Authorization'] = `Bearer ${store.authToken}`;
    }

    const response = await fetch(`${backendUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Backend error ${response.status}`);
    }
    return response.json();
  }

  async saveToHistory(query, queryType, summary) {
    try {
      const backendUrl = store.backendUrl || 'http://localhost:8000';
      const headers = { 'Content-Type': 'application/json' };
      if (store.authToken) {
        headers['Authorization'] = `Bearer ${store.authToken}`;
      }

      await fetch(`${backendUrl}/api/history`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query, query_type: queryType, result_summary: summary }),
      });

      // Also save to localStorage
      const history = store.searchHistory || [];
      const entry = { id: Date.now(), query, query_type: queryType, created_at: new Date().toISOString() };
      store.searchHistory = [entry, ...history].slice(0, 50);
    } catch (e) {
      // History saving is non-critical
      console.warn('Could not save to history:', e.message);
    }
  }
}

export const analyzer = new Analyzer();
