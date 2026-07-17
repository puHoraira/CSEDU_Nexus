import { ApiUser } from "../lib/api";

/**
 * Determines the user type based on their roles
 * Priority: System Admin > Teacher > Alumni > Student
 */
export function getUserType(user: ApiUser | null): 'admin' | 'teacher' | 'alumni' | 'student' | 'guest' {
  if (!user || !user.roles || user.roles.length === 0) {
    return 'guest';
  }

  const roles = user.roles.map(r => r.toLowerCase());

  // Check Teacher role FIRST (before admin roles)
  // Teachers can also be moderators, but they should see teacher dashboard primarily
  if (
    roles.includes('teacher') ||
    (user.designation && 
     (user.designation.includes('Professor') || 
      user.designation.includes('Lecturer') ||
      user.designation.includes('Instructor') ||
      user.designation.includes('Assistant_Professor') ||
      user.designation.includes('Associate_Professor')))
  ) {
    return 'teacher';
  }

  // System Admin, Moderator, Chief Patron -> Admin Dashboard
  // Only if they're NOT teachers
  if (
    roles.includes('system admin') ||
    roles.includes('moderator') ||
    roles.includes('chief patron')
  ) {
    return 'admin';
  }

  // Alumni role
  if (roles.includes('alumni')) {
    return 'alumni';
  }

  // Default to student for General Member and other member roles
  if (
    roles.includes('general member') ||
    roles.includes('president') ||
    roles.includes('vice president') ||
    roles.includes('general secretary') ||
    roles.some(r => r.includes('ags') || r.includes('secretary') || r.includes('treasurer'))
  ) {
    return 'student';
  }

  // Default fallback
  return 'student';
}

/**
 * Gets the default dashboard route based on user type
 */
export function getDefaultDashboardRoute(user: ApiUser | null): string {
  const userType = getUserType(user);

  switch (userType) {
    case 'admin':
      return '/dashboard/admin';
    case 'teacher':
      return '/dashboard/teacher';
    case 'alumni':
      return '/dashboard/alumni';
    case 'student':
      return '/dashboard/student';
    default:
      return '/dashboard/home';
  }
}

/**
 * Gets user-friendly display name for user type
 */
export function getUserTypeDisplayName(userType: string): string {
  switch (userType) {
    case 'admin':
      return 'Administrator';
    case 'teacher':
      return 'Faculty';
    case 'alumni':
      return 'Alumni';
    case 'student':
      return 'Student';
    default:
      return 'User';
  }
}

/**
 * Checks if user has specific permission/role
 */
export function hasRole(user: ApiUser | null, role: string): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some(r => r.toLowerCase() === role.toLowerCase());
}

/**
 * Checks if user has any of the specified roles
 */
export function hasAnyRole(user: ApiUser | null, roles: string[]): boolean {
  if (!user || !user.roles) return false;
  const userRoles = user.roles.map(r => r.toLowerCase());
  return roles.some(role => userRoles.includes(role.toLowerCase()));
}

/**
 * Gets a welcome message based on user type
 */
export function getWelcomeMessage(user: ApiUser | null): string {
  if (!user) return 'Welcome to CSEDU Nexus';
  
  const userType = getUserType(user);
  const firstName = user.firstName || 'there';

  switch (userType) {
    case 'admin':
      return `Welcome back, Admin ${firstName}`;
    case 'teacher':
      return `Welcome, ${user.designation || 'Professor'} ${firstName}`;
    case 'alumni':
      return `Welcome back, ${firstName}`;
    case 'student':
      return `Welcome, ${firstName}`;
    default:
      return `Welcome, ${firstName}`;
  }
}
