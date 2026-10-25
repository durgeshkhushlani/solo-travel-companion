// DTO shaping at the API boundary: never leak password hashes or other users emails.
export function toUserDto(user, viewer) {
  const canSeeEmail = viewer && (viewer.id === user.id || viewer.role === 'ADMIN');
  return {
    id: user.id,
    name: user.name,
    bio: user.bio,
    photoUrl: user.photoUrl,
    interests: user.interests,
    travelStyle: user.travelStyle,
    role: user.role,
    ...(canSeeEmail && { email: user.email }),
  };
}
