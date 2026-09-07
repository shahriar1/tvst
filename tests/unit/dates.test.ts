import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { Show } from '../../src/api/types.js';
import {
  airTimeOf,
  formatLocalTime,
  formatNetworkTime,
  now,
  parseDateArg,
  relativeTime,
  sameZoneAsUser,
} from '../../src/lib/dates.js';
import { CliError } from '../../src/lib/output.js';

// vitest.config pins TZ=America/New_York and TVST_NOW=2016-02-01T12:00:00-05:00
const reference = DateTime.fromISO('2016-02-01T12:00:00', { zone: 'America/New_York' });

const showIn = (timezone: string | null, kind: 'network' | 'web' = 'network'): Show =>
  ({
    id: 1,
    name: 'x',
    network:
      kind === 'network'
        ? { id: 1, name: 'N', country: timezone ? { name: '', code: 'XX', timezone } : null }
        : null,
    webChannel:
      kind === 'web'
        ? { id: 1, name: 'W', country: timezone ? { name: '', code: 'XX', timezone } : null }
        : null,
  }) as unknown as Show;

describe('now', () => {
  it('honours TVST_NOW', () => {
    expect(now().toISO()).toBe('2016-02-01T12:00:00.000-05:00');
  });
});

describe('parseDateArg', () => {
  it('defaults to today', () => {
    expect(parseDateArg(undefined, reference).toISODate()).toBe('2016-02-01');
    expect(parseDateArg('today', reference).toISODate()).toBe('2016-02-01');
  });

  it('understands relative words', () => {
    expect(parseDateArg('tomorrow', reference).toISODate()).toBe('2016-02-02');
    expect(parseDateArg('yesterday', reference).toISODate()).toBe('2016-01-31');
    expect(parseDateArg('friday', reference).toISODate()).toBe('2016-02-05');
    expect(parseDateArg('next friday', reference).toISODate()).toBe('2016-02-12');
    expect(parseDateArg('feb 14', reference).toISODate()).toBe('2016-02-14');
  });

  it('keeps ISO dates on the same calendar day (no UTC drift)', () => {
    const day = parseDateArg('2016-06-14', reference);
    expect(day.toISODate()).toBe('2016-06-14');
    expect(day.hour).toBe(0);
    expect(day.zoneName).toBe('America/New_York');
  });

  it('rejects nonsense with a usage error', () => {
    expect(() => parseDateArg('blorp', reference)).toThrowError(CliError);
    try {
      parseDateArg('blorp', reference);
    } catch (error) {
      expect((error as CliError).exitCode).toBe(2);
    }
  });
});

describe('airTimeOf', () => {
  it('prefers airstamp and keeps the network zone', () => {
    const air = airTimeOf(
      { airstamp: '2016-02-02T01:00:00+00:00', airdate: '2016-02-01', airtime: '20:00' },
      showIn('America/New_York'),
    );
    expect(air.hasTime).toBe(true);
    expect(air.networkZone).toBe('America/New_York');
    expect(formatNetworkTime(air)).toBe('8:00 PM EST');
    expect(formatLocalTime(air)).toBe('8:00 PM EST');
    expect(sameZoneAsUser(air)).toBe(true);
    expect(relativeTime(air, reference)).toBe('in 8 hours');
  });

  it('converts between network and user zones', () => {
    const air = airTimeOf(
      { airstamp: '2016-02-01T21:00:00+00:00', airdate: '2016-02-01', airtime: '21:00' },
      showIn('Europe/London'),
    );
    expect(formatNetworkTime(air)).toBe('9:00 PM GMT');
    expect(formatLocalTime(air)).toBe('4:00 PM EST');
    expect(sameZoneAsUser(air)).toBe(false);
  });

  it('does not invent a network zone for global streamers', () => {
    const air = airTimeOf(
      { airstamp: '2016-02-01T08:00:00+00:00', airdate: '2016-02-01', airtime: '' },
      showIn(null, 'web'),
    );
    expect(air.networkZone).toBeNull();
    expect(formatNetworkTime(air)).toBe('n/a');
    expect(formatLocalTime(air)).toBe('3:00 AM EST');
  });

  it('falls back to airdate + airtime in the network zone', () => {
    const air = airTimeOf(
      { airstamp: null, airdate: '2016-02-01', airtime: '20:00' },
      showIn('America/Los_Angeles'),
    );
    expect(air.hasTime).toBe(true);
    expect(formatNetworkTime(air)).toBe('8:00 PM PST');
    expect(formatLocalTime(air)).toBe('11:00 PM EST');
  });

  it('handles date-only episodes', () => {
    const air = airTimeOf(
      { airstamp: null, airdate: '2016-02-03', airtime: '' },
      showIn(null, 'web'),
    );
    expect(air.hasTime).toBe(false);
    expect(formatNetworkTime(air)).toBe('Wed, Feb 3 2016');
    expect(relativeTime(air, reference)).toBe('in 2 days');
  });

  it('handles unknown air times', () => {
    const air = airTimeOf({ airstamp: null, airdate: '', airtime: '' }, undefined);
    expect(air.instant).toBeNull();
    expect(formatNetworkTime(air)).toBe('TBA');
    expect(relativeTime(air, reference)).toBe('unknown');
  });
});
