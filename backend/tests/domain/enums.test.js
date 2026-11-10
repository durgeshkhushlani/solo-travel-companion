import { describe, it, expect } from 'vitest';
import { PlanStatus, RequestStatus, Role, parseEnum } from '../../src/domain/enums.js';

describe('parseEnum', () => {
  it('returns_the_member_when_the_text_names_one', () => {
    const parsed = parseEnum(PlanStatus, 'FULL');

    expect(parsed).toBe(PlanStatus.FULL);
  });

  it.each([
    ['lowercase text', 'full'],
    ['an unknown name', 'ARCHIVED'],
    ['an inherited object key', 'toString'],
    ['an empty string', ''],
    ['a number', 1],
    ['undefined', undefined],
    ['null', null],
  ])('returns_null_for_%s', (_label, input) => {
    expect(parseEnum(PlanStatus, input)).toBeNull();
  });
});

describe('enums', () => {
  it('cannot_be_changed_after_definition', () => {
    expect(() => {
      RequestStatus.PENDING = 'DONE';
    }).toThrow(TypeError);
  });

  it('have_the_members_named_in_the_glossary', () => {
    expect(Object.keys(Role)).toEqual(['USER', 'ADMIN']);
    expect(Object.keys(RequestStatus)).toEqual(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']);
  });
});
