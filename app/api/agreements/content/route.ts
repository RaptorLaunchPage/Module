import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { CURRENT_AGREEMENT_VERSIONS } from '@/lib/agreement-versions'

// Static agreement content (can be moved to database later)
const AGREEMENT_CONTENT = {
  player: {
    role: 'player',
    current_version: 2,
    title: 'Player Agreement v2.0',
    last_updated: 'January 2025',
    content: `# Raptors Esports Player Agreement

## 1. Commitment and Expectations
As a player for Raptors Esports, you agree to:
- Maintain regular attendance for scheduled practice sessions
- Participate professionally in tournaments and matches
- Represent the organization with integrity and sportsmanship
- Follow team communication protocols and guidelines

## 2. Performance Standards
- Maintain consistent performance metrics as defined by coaching staff
- Participate in performance reviews and improvement programs
- Adhere to practice schedules and team strategies
- Report any issues affecting gameplay or team dynamics

## 3. Code of Conduct
- Treat all team members, opponents, and staff with respect
- Avoid toxic behavior in games and communications
- Maintain confidentiality of team strategies and internal matters
- Follow all tournament rules and regulations

## 4. Equipment and Resources
- Take care of any provided equipment or resources
- Ensure stable internet connection and appropriate gaming setup
- Report technical issues that may affect performance
- Use approved software and game configurations

## 5. Termination and Changes
- Either party may terminate this agreement with appropriate notice
- Changes to this agreement require written consent
- Violation of terms may result in immediate termination
- All team property must be returned upon termination

By accepting this agreement, you acknowledge that you have read, understood, and agree to be bound by these terms.`
  },
  coach: {
    role: 'coach',
    current_version: 1,
    title: 'Coach Agreement v1.0',
    last_updated: 'January 2025',
    content: `# Raptors Esports Coach Agreement

## 1. Leadership Responsibilities
As a coach for Raptors Esports, you agree to:
- Provide strategic guidance and training to assigned teams
- Develop and implement practice schedules and training programs
- Monitor player performance and provide constructive feedback
- Maintain professional communication with players and management

## 2. Team Development
- Create comprehensive training programs for skill improvement
- Analyze gameplay and provide strategic insights
- Foster team cohesion and positive team culture
- Identify areas for improvement and implement solutions

## 3. Administrative Duties
- Maintain accurate records of player performance and attendance
- Coordinate with management on team needs and resources
- Participate in staff meetings and strategic planning sessions
- Ensure compliance with tournament rules and regulations

## 4. Professional Standards
- Maintain confidentiality of team strategies and player information
- Demonstrate professional behavior at all times
- Continuous learning and adaptation to game meta changes
- Provide fair and unbiased evaluation of all players

By accepting this agreement, you acknowledge your commitment to excellence in coaching and team development.`
  },
  manager: {
    role: 'manager',
    current_version: 1,
    title: 'Manager Agreement v1.0',
    last_updated: 'January 2025',
    content: `# Raptors Esports Manager Agreement

## 1. Management Responsibilities
As a manager for Raptors Esports, you agree to:
- Oversee team operations and administrative functions
- Coordinate between players, coaches, and organization leadership
- Manage schedules, tournaments, and team logistics
- Ensure smooth day-to-day operations of assigned teams

## 2. Strategic Oversight
- Participate in strategic planning and decision-making processes
- Monitor team performance metrics and organizational goals
- Identify opportunities for team and organizational improvement
- Maintain awareness of industry trends and competitive landscape

## 3. Communication and Coordination
- Facilitate effective communication between all stakeholders
- Organize and lead team meetings and strategic sessions
- Serve as primary point of contact for external communications
- Maintain professional relationships with sponsors and partners

## 4. Compliance and Standards
- Ensure all team activities comply with organizational policies
- Maintain confidentiality of sensitive organizational information
- Uphold professional standards in all interactions
- Support the organization's values and mission

By accepting this agreement, you commit to excellence in management and organizational leadership.`
  },
  analyst: {
    role: 'analyst',
    current_version: 1,
    title: 'Analyst Agreement v1.0',
    last_updated: 'January 2025',
    content: `# Raptors Esports Analyst Agreement

## 1. Analysis Responsibilities
As an analyst for Raptors Esports, you agree to:
- Provide detailed performance analysis and insights
- Monitor and evaluate team and individual player statistics
- Research opponent strategies and provide competitive intelligence
- Support coaching staff with data-driven recommendations

## 2. Data Management
- Maintain accurate and comprehensive performance databases
- Ensure data integrity and confidentiality
- Provide timely reports and analysis to coaching staff
- Utilize appropriate tools and methodologies for analysis

## 3. Strategic Support
- Collaborate with coaches to develop game strategies
- Identify trends and patterns in gameplay data
- Provide pre-game and post-game analysis reports
- Support player development through performance insights

## 4. Professional Standards
- Maintain objectivity and accuracy in all analysis
- Protect confidential team and player information
- Continuously improve analytical skills and methodologies
- Communicate findings clearly and effectively

By accepting this agreement, you commit to providing valuable analytical support to enhance team performance.`
  },
  tryout: {
    role: 'tryout',
    current_version: 1,
    title: 'Tryout Participant Agreement v1.0',
    last_updated: 'January 2025',
    content: `# Raptors Esports Tryout Agreement

## 1. Tryout Participation
As a tryout participant for Raptors Esports, you agree to:
- Participate fully in all assigned tryout activities
- Demonstrate your best effort and sportsmanship
- Follow all instructions from coaching and evaluation staff
- Respect other participants and maintain professional conduct

## 2. Evaluation Process
- Understand that tryouts are competitive and selective
- Accept evaluation decisions made by the coaching staff
- Provide honest information about your experience and availability
- Participate in feedback sessions if requested

## 3. Confidentiality
- Keep all tryout processes and team strategies confidential
- Not share information about other participants
- Respect the privacy of team members and staff
- Maintain discretion regarding organizational operations

## 4. Temporary Access
- Understand that access is temporary and limited to tryout period
- Return any provided equipment or materials
- Not access team resources beyond authorized scope
- Respect the temporary nature of the arrangement

By accepting this agreement, you acknowledge the terms of your tryout participation.`
  }
}

// GET /api/agreements/content?role=player - Get agreement content for a role
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role) {
      return NextResponse.json({ error: 'Role parameter is required' }, { status: 400 })
    }

    const content = AGREEMENT_CONTENT[role as keyof typeof AGREEMENT_CONTENT]
    if (!content) {
      return NextResponse.json({ error: 'Agreement content not found for role' }, { status: 404 })
    }

    return NextResponse.json({
      agreement: content
    })

  } catch (error) {
    console.error('Agreement content error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
