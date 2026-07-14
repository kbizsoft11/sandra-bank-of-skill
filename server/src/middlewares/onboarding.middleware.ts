import { Request, Response, NextFunction } from 'express';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { UserModel } from '../models/user.model';

export const requireCompletedOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.hasCompletedOnboarding) {
      return next();
    }

    const pendingResponse = await QuestionnaireResponseModel.findOne({
      employeeId: userId,
      status: { $in: ['pending', 'in_progress'] },
    }).sort({ assignedAt: 1 });

    if (!pendingResponse) {
      return next();
    }

    const questionnaire = await QuestionnaireModel.findById(pendingResponse.questionnaireId);

    if (!questionnaire?.isOnboardingQuestionnaire) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Please complete the onboarding questionnaire before accessing the dashboard.',
      requiresOnboarding: true,
    });
  } catch (error) {
    console.error('Onboarding middleware error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify onboarding status.' });
  }
};
