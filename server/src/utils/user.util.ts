import { userRepository } from "../repositories/user.repository";

/**
 * Get user full name from token or fetch from database as fallback
 * This ensures activity logs always have the correct username
 */
export async function getUserFullName(
  fullNameFromToken: string | undefined,
  userId: string | undefined
): Promise<string> {
  // If we have fullName from token, use it
  if (fullNameFromToken) {
    return fullNameFromToken;
  }

  // If no userId, return Unknown
  if (!userId) {
    return 'Unknown';
  }

  // Try to fetch from database
  try {
    console.warn(`fullName missing from token for userId ${userId}, fetching from database`);
    const user = await userRepository.findById(userId);
    return user?.fullName || 'Unknown';
  } catch (err) {
    console.error('Error fetching user from database:', err);
    return 'Unknown';
  }
}
