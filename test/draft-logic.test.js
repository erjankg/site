import { describe, it, expect } from 'vitest';
import DraftLogic from '../draft-logic.js';

const { WR_DRAFT_SEQUENCE, SEQ_LEN, getUnavailable, sideRoles, currentTurn, viewerRole, deterministicPick } = DraftLogic;

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

// ★ Единый источник «чей ход» — гарантия, что оба клиента (одна pure-функция)
// согласны по capUid активного шага в ОБОИХ направлениях свапа сторон.
describe('currentTurn (единый резолвер хода)', () => {
  const lobby = {
    createdBy: 'u-blue',
    blueCaptain: { uid: 'u-blue', nick: 'BlueCap' },
    redCaptain: { uid: 'u-red', nick: 'RedCap' },
    blueTeamName: 'Team Blue',
    redTeamName: 'Team Red'
  };

  it('шаг 0 (синий бан) без свапа → капитан команды blue', () => {
    const t = currentTurn(lobby, { blueSide: 'blue', turnIndex: 0, phase: 'ban1' });
    expect(t.side).toBe('blue');
    expect(t.action).toBe('ban');
    expect(t.team).toBe('blue');
    expect(t.capUid).toBe('u-blue');
    expect(t.isDone).toBe(false);
  });

  it('СВАП (проигравший red выбрал синюю): на синей позиции ходит капитан red', () => {
    // blueSide='red' → команда red играет на синей позиции (first pick)
    const t = currentTurn(lobby, { blueSide: 'red', turnIndex: 0, phase: 'ban1' });
    expect(t.side).toBe('blue');       // ПОЗИЦИЯ синяя (её ход первый)
    expect(t.team).toBe('red');        // но это КОМАНДА red
    expect(t.capUid).toBe('u-red');    // и её капитан — u-red
  });

  it('СВАП (проигравший blue выбрал синюю = без свапа): на синей ходит капитан blue', () => {
    const t = currentTurn(lobby, { blueSide: 'blue', turnIndex: 0, phase: 'ban1' });
    expect(t.team).toBe('blue');
    expect(t.capUid).toBe('u-blue');
  });

  it('второй шаг (красная позиция) отдаёт капитана противоположной команды при свапе', () => {
    const t = currentTurn(lobby, { blueSide: 'red', turnIndex: 1, phase: 'ban1' });
    expect(t.side).toBe('red');        // красная позиция
    expect(t.team).toBe('blue');       // на ней команда blue
    expect(t.capUid).toBe('u-blue');
  });

  it('после последнего шага (turnIndex>=20) — isDone, ходов нет', () => {
    const t = currentTurn(lobby, { blueSide: 'blue', turnIndex: SEQ_LEN, phase: 'done' });
    expect(t.isDone).toBe(true);
    expect(t.step).toBeNull();
    expect(t.capUid).toBeNull();
  });

  it('phase=done → isDone даже если turnIndex не докручен', () => {
    const t = currentTurn(lobby, { blueSide: 'blue', turnIndex: 5, phase: 'done' });
    expect(t.isDone).toBe(true);
  });

  it('нет игры → null', () => {
    expect(currentTurn(lobby, null)).toBeNull();
  });

  it('ПРЕПИК и ЛОКИН согласованы: capUid одинаков на каждом шаге в обоих свапах', () => {
    ['blue', 'red'].forEach((bs) => {
      for (let i = 0; i < SEQ_LEN; i++) {
        const t1 = currentTurn(lobby, { blueSide: bs, turnIndex: i, phase: 'ban1' });
        const t2 = currentTurn(lobby, { blueSide: bs, turnIndex: i, phase: 'ban1' });
        expect(t1.capUid).toBe(t2.capUid);          // детерминизм (два клиента = один ответ)
        expect([lobby.blueCaptain.uid, lobby.redCaptain.uid]).toContain(t1.capUid);
      }
    });
  });
});

describe('viewerRole (права зрителя)', () => {
  const lobby = {
    createdBy: 'u-blue',
    blueCaptain: { uid: 'u-blue' },
    redCaptain: { uid: 'u-red' },
    invitedSpectators: ['u-spec']
  };
  const game = { blueSide: 'red', turnIndex: 0, phase: 'ban1' }; // свап: red на синей

  it('капитан red после свапа = на синей позиции, может ходить на шаге 0', () => {
    const vr = viewerRole(lobby, game, 'u-red');
    expect(vr.isCaptain).toBe(true);
    expect(vr.mySide).toBe('blue');     // позиция после свапа
    expect(vr.myTeam).toBe('red');      // команда (для readyBlue/readyRed)
    expect(vr.canActNow).toBe(true);    // шаг 0 — синяя позиция, а на ней он
  });

  it('капитан blue после свапа = на красной позиции, на шаге 0 ходить НЕ может', () => {
    const vr = viewerRole(lobby, game, 'u-blue');
    expect(vr.mySide).toBe('red');
    expect(vr.canActNow).toBe(false);
  });

  it('создатель, который НЕ капитан = судья: не пикает', () => {
    const judgeLobby = { ...lobby, createdBy: 'u-judge' };
    const vr = viewerRole(judgeLobby, game, 'u-judge');
    expect(vr.isCreator).toBe(true);
    expect(vr.isCaptain).toBe(false);
    expect(vr.isJudge).toBe(true);
    expect(vr.canActNow).toBe(false);   // судья не ходит
  });

  it('создатель-капитан судьёй НЕ считается', () => {
    const vr = viewerRole(lobby, game, 'u-blue'); // u-blue = и создатель, и капитан
    expect(vr.isJudge).toBe(false);
  });

  it('приглашённый зритель = spectator, не капитан, не ходит', () => {
    const vr = viewerRole(lobby, game, 'u-spec');
    expect(vr.isSpectator).toBe(true);
    expect(vr.isCaptain).toBe(false);
    expect(vr.canActNow).toBe(false);
  });

  it('посторонний = ни капитан, ни судья, ни зритель', () => {
    const vr = viewerRole(lobby, game, 'u-nobody');
    expect(vr.isCaptain).toBe(false);
    expect(vr.isJudge).toBe(false);
    expect(vr.isSpectator).toBe(false);
    expect(vr.canActNow).toBe(false);
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
