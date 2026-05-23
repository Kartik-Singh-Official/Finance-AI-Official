/**
 * Sanitizes and formats Supabase and internal authentication error messages
 * into customer-friendly, professional, and secure strings to prevent raw
 * database/internal system detail exposures.
 */
export function getFriendlyErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred. Please try again.";
  
  const msg = err.message || String(err);
  const lowercaseMsg = msg.toLowerCase();

  if (
    lowercaseMsg.includes("invalid login credentials") || 
    lowercaseMsg.includes("invalid claims") || 
    lowercaseMsg.includes("email or password")
  ) {
    return "Invalid email address or password. Please verify and try again.";
  }
  
  if (
    lowercaseMsg.includes("email not confirmed") || 
    lowercaseMsg.includes("email_not_confirmed") ||
    lowercaseMsg.includes("confirm email")
  ) {
    return "Your email address is not verified yet. Please check your inbox for the confirmation link.";
  }
  
  if (
    lowercaseMsg.includes("user already exists") || 
    lowercaseMsg.includes("already registered") ||
    lowercaseMsg.includes("email already in use")
  ) {
    return "An account with this email address already exists. Try logging in instead.";
  }
  
  if (
    lowercaseMsg.includes("password is too short") || 
    lowercaseMsg.includes("password should be at least")
  ) {
    return "Password is too weak. It must be at least 8 characters long and meet complexity requirements.";
  }
  
  if (
    lowercaseMsg.includes("rate limit") || 
    lowercaseMsg.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a brief moment before trying again.";
  }
  
  // Return the message directly if it is standard, but otherwise fall back to a safe fallback
  if (msg.length > 100 || lowercaseMsg.includes("postgres") || lowercaseMsg.includes("database") || lowercaseMsg.includes("row-level")) {
    return "Unable to complete operation. Please contact support or try again later.";
  }

  return msg;
}
