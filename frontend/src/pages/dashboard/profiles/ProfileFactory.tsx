import { StudentProfile } from "./StudentProfile";
import { StaffProfile } from "./StaffProfile";

type ProfileFactoryProps = {
  user: any;
  membership: any;
  token: string | null;
  onUpdate: () => void;
};

/**
 * Factory pattern to render the appropriate profile component
 * based on user type (Student vs Staff/Alumni/Moderator)
 * 
 * This follows SOLID principles:
 * - Single Responsibility: Each profile component handles its own user type
 * - Open/Closed: Easy to add new profile types without modifying existing code
 * - Dependency Inversion: Components depend on abstractions (props) not concrete implementations
 */
export function ProfileFactory({ user, membership, token, onUpdate }: ProfileFactoryProps) {
  // Determine user type based on membership existence
  const isStudent = Boolean(membership);
  
  // Render appropriate profile component
  if (isStudent) {
    return <StudentProfile user={user} membership={membership} token={token} onUpdate={onUpdate} />;
  }
  
  return <StaffProfile user={user} token={token} onUpdate={onUpdate} />;
}
