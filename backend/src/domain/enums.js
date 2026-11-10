// Statuses and roles as closed sets. Names mirror the Prisma enums and the glossary.
const defineEnum = (...names) => Object.freeze(Object.fromEntries(names.map((n) => [n, n])));

export const Role = defineEnum('USER', 'ADMIN');
export const PlanStatus = defineEnum('OPEN', 'FULL', 'CLOSED');
export const RequestStatus = defineEnum('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
export const FriendStatus = defineEnum('PENDING', 'ACCEPTED');

// Parse, don't validate: returns the member, or null when the input is not one.
export function parseEnum(enumObject, value) {
  return typeof value === 'string' && Object.hasOwn(enumObject, value) ? enumObject[value] : null;
}
