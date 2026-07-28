import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';

/**
 * Middleware to verify registration token
 * This is used for steps that require the user to be in the registration process
 */
export const verifyRegistrationToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded?.userId || !decoded?.email) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
        }

        // Attach user info to request
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};

/**
 * Middleware to check if user has completed a specific registration step
 */
export const checkRegistrationStep = (requiredStatus: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userEmail = req.user?.email;

            if (!userEmail) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }

            const user = await userRepository.findByEmail(userEmail);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            // Check if user has completed required step
            const statusOrder = ['registered', 'email_verified', 'completed'];
            const userStatusIndex = statusOrder.indexOf(user.onboardingStatus);
            const requiredStatusIndex = statusOrder.indexOf(requiredStatus);

            if (userStatusIndex < requiredStatusIndex) {
                return res.status(403).json({
                    success: false,
                    message: `Please complete previous registration steps first. Current status: ${user.onboardingStatus}`,
                    currentStep: userStatusIndex + 1,
                    requiredStep: requiredStatusIndex + 1,
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error checking registration status',
            });
        }
    };
};

/**
 * Middleware to ensure email is verified before proceeding
 */
export const ensureEmailVerified = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userEmail = req.user?.email;

        if (!userEmail) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const user = await userRepository.findByEmail(userEmail);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first',
                currentStep: 1,
                requiredStep: 2,
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error verifying email status',
        });
    }
};
