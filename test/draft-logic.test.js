import { describe, it, expect } from 'vitest';
import DraftLogic from '../draft-logic.js';

const { WR_DRAFT_SEQUENCE, SEQ_LEN, getUnavailable, sideRoles, deterministicPick } = DraftLogic;

describe('WR_DRAFT_SEQUENCE', () => {
  it('содержит ровно 20 шагов', () => {
    expect(WR_DRAFT_SEQUENCE).toHaveLength(20);
    expect(SEQ_LEN).toBe(20);
  });

  it('6 банов + 6 пиков в первой половине, 4 бана + 4 пика во второй', () => {
    const bans = WR_DRAFT_SEQUENCE.filter((s) => s.action === 'ban');
    const picks = WR_DRAFT_SEQUENCE.filter((s) => s.action === 'pick');
    expect(bans).toHaveLength(10);
    expect(picks).toHaveLength(10);
  });

  it('каждая сторона делает по 5 пиков', () => {
    const bluePicks = WR_DRAFT_SEQUENCE.filter((s) => s.action === 'pick' && s.side === 'blue');
    const redPicks = WR_DRAFT_SEQUENCE.filter((s) => s.action === 'pick' && s.side === 'red');
    expect(bluePicks).toHaveLength(5);
    expect(redPicks).toHaveLength(5);
  });

  it('каждая сторона делает по 5 банов', () => {
    const blueBans = WR_DRAFT_SEQUENCE.filter((s) => s.action === 'ban' && s.side === 'blue');
    const redBans = WR_DRAFT_SEQUENCE.filter((s) => s.action === 'ban' && s.side === 'red');
    expect(blueBans).toHaveLength(5);
    expect(redBans).toHaveLength(5);
  });

  it('pickIdx у пиков каждой стороны покрывает 0..4 без повторов', () => {
    ['blue', 'red'].forEach((side) => {
      const idxs = WR_DRAFT_SEQUENCE
        .filter((s) => s.action === 'pick' && s.side === side)
        .map((s) => s.pickIdx)
        .sort((a, b) => a - b);
      expect(idxs).toEqual([0, 1, 2, 3, 4]);
    });
  });

  it('banIdx у банов каждой стороны покрывает 0..4 без повторов', () => {
    ['blue', 'red'].forEach((side) => {
      const idxs = WR_DRAFT_SEQUENCE
        .filter((s) => s.action === 'ban' && s.side === side)
        .map((s) => s.banIdx)
        .sort((a, b) => a - b);
      expect(idxs).toEqual([0, 1, 2, 3, 4]);
    });
  });

  it('первый ход — синий бан, последний — красный пик', () => {
    expect(WR_DRAFT_SEQUENCE[0]).toMatchObject({ side: 'blue', action: 'ban' });
    expect(WR_DRAFT_SEQUENCE[19]).toMatchObject({ side: 'red', action: 'pick' });
  });

  it('первый пик принадлежит синей стороне (First Pick advantage)', () => {
    const firstPick = WR_DRAFT_SEQUENCE.find((s) => s.action === 'pick');
    expect(firstPick.side).toBe('blue');
  });
});

describe('getUnavailable', () => {
  const emptyGame = { bans: { blue: [], red: [] }, picks: { blue: [], red: [] } };

  it('пустая игра — ничего не занято', () => {
    expect(getUnavailable(emptyGame, [], [])).toEqual({});
  });

  it('помечает баны обеих сторон как banned', () => {
    const game = { bans: { blue: ['Ahri'], red: ['Zed'] }, picks: { blue: [], red: [] } };
    const u = getUnavailable(game, [], []);
    expect(u.Ahri).toBe('banned');
    expect(u.Zed).toBe('banned');
  });

  it('помечает пики как picked', () => {
    const game = {
      bans: { blue: [], red: [] },
      picks: { blue: [{ champ: 'Lux' }], red: [{ champ: 'Jinx' }] }
    };
    const u = getUnavailable(game, [], []);
    expect(u.Lux).toBe('picked');
    expect(u.Jinx).toBe('picked');
  });

  it('fearless-lock и global-ban помечаются своими статусами', () => {
    const u = getUnavailable(emptyGame, ['Yasuo'], ['Teemo']);
    expect(u.Yasuo).toBe('fearless');
    expect(u.Teemo).toBe('global');
  });

  it('ban имеет приоритет над fearless-lock для того же чемпиона', () => {
    const game = { bans: { blue: ['Yasuo'], red: [] }, picks: { blue: [], red: [] } };
    const u = getUnavailable(game, ['Yasuo'], []);
    expect(u.Yasuo).toBe('banned');
  });

  it('pick имеет приоритет над global-ban', () => {
    const game = { bans: { blue: [], red: [] }, picks: { blue: [{ champ: 'Lux' }], red: [] } };
    const u = getUnavailable(game, [], ['Lux']);
    expect(u.Lux).toBe('picked');
  });

  it('пустые слоты (null) не попадают в результат', () => {
    const game = {
      bans: { blue: [null, 'Ahri', null], red: [] },
      picks: { blue: [null, { champ: 'Lux' }], red: [] }
    };
    const u = getUnavailable(game, [], []);
    expect(Object.keys(u).sort()).toEqual(['Ahri', 'Lux']);
  });
});

describe('sideRoles', () => {
  const lobby = {
    blueCaptain: { uid: 'u-blue', nick: 'BlueCap' },
    redCaptain: { uid: 'u-red', nick: 'RedCap' },
    blueTeamName: 'Team Blue',
    redTeamName: 'Team Red'
  };

  it('blueSide=blue — команды на своих позициях', () => {
    const r = sideRoles(lobby, { blueSide: 'blue' });
    expect(r.blue.team).toBe('blue');
    expect(r.blue.cap.uid).toBe('u-blue');
    expect(r.blue.teamName).toBe('Team Blue');
    expect(r.red.team).toBe('red');
    expect(r.red.cap.uid).toBe('u-red');
  });

  it('blueSide=red — команды свапнуты местами', () => {
    const r = sideRoles(lobby, { blueSide: 'red' });
    // на синей позиции теперь команда red
    expect(r.blue.team).toBe('red');
    expect(r.blue.cap.uid).toBe('u-red');
    expect(r.blue.teamName).toBe('Team Red');
    // на красной позиции теперь команда blue
    expect(r.red.team).toBe('blue');
    expect(r.red.cap.uid).toBe('u-blue');
  });

  it('fallback на currentGameBlueSide если game.blueSide отсутствует', () => {
    const r = sideRoles({ ...lobby, currentGameBlueSide: 'red' }, {});
    expect(r.blue.team).toBe('red');
  });

  it('дефолт blue если ничего не задано', () => {
    const r = sideRoles(lobby, {});
    expect(r.blue.team).toBe('blue');
  });

  it('дефолтные имена команд если не заданы', () => {
    const r = sideRoles({}, {});
    expect(r.blue.teamName).toBe('Blue');
    expect(r.red.teamName).toBe('Red');
  });
});

describe('deterministicPick', () => {
  const pool = ['Ahri', 'Zed', 'Lux', 'Jinx', 'Garen'];

  it('один и тот же seed → один и тот же результат', () => {
    const a = deterministicPick('lobby1:game1:turn5', pool);
    const b = deterministicPick('lobby1:game1:turn5', pool);
    expect(a).toBe(b);
  });

  it('результат всегда из пула', () => {
    for (let i = 0; i < 50; i++) {
      const pick = deterministicPick('seed-' + i, pool);
      expect(pool).toContain(pick);
    }
  });

  it('разные seed дают разброс по пулу (не всегда один элемент)', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      seen.add(deterministicPick('s' + i, pool));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('пустой пул → undefined (не падает)', () => {
    expect(deterministicPick('seed', [])).toBeUndefined();
    expect(deterministicPick('seed', null)).toBeUndefined();
  });

  it('пул из одного элемента → всегда он', () => {
    expect(deterministicPick('any', ['Solo'])).toBe('Solo');
  });

  it('seed null/undefined не ломает функцию', () => {
    expect(pool).toContain(deterministicPick(null, pool));
    expect(pool).toContain(deterministicPick(undefined, pool));
  });
});
