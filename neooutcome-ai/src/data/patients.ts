import type { Patient, VitalTrendPoint } from '@/types'

function mkHistory(
  base: { hr: number; spo2: number; temp: number },
  points = 12,
): VitalTrendPoint[] {
  return Array.from({ length: points }, (_, i) => {
    const drift = Math.sin(i / 2) * 3
    return {
      t: `-${(points - i) * 5}m`,
      heartRate: Math.round(base.hr + drift + (i % 3) - 1),
      spo2: Math.max(
        84,
        Math.min(100, Math.round(base.spo2 - Math.abs(drift) / 2)),
      ),
      temperature: Number((base.temp + drift / 20).toFixed(1)),
    }
  })
}

export const PATIENTS: Patient[] = [
  {
    id: 'NEO-0421',
    name: 'Ребёнок А. Нурлан',
    bed: 'Блок 3 · инкубатор 12',
    gestationalAgeWeeks: 27,
    birthWeightGrams: 940,
    dayOfLife: 5,
    status: 'critical',
    riskScore: 78,
    riskDelta: 6,
    lastUpdated: '2 мин назад',
    baselineRisk: 34,
    vitals: {
      heartRate: 172,
      spo2: 89,
      temperature: 36.2,
      respiratoryRate: 62,
      meanBloodPressure: 28,
    },
    vitalHistory: mkHistory({ hr: 168, spo2: 90, temp: 36.3 }),
    shap: [
      {
        feature: 'fio2',
        label: 'Потребность в FiO₂',
        contribution: 18,
        value: '0.55',
        insight:
          'Высокая потребность в дополнительном кислороде (FiO₂ 0.55) — главный фактор повышенного риска на 24 ч. Стойко высокий FiO₂ связан с нарастающей дыхательной недостаточностью.',
      },
      {
        feature: 'apnea',
        label: 'Эпизоды апноэ (6 ч)',
        contribution: 12,
        value: '7 эпизодов',
        insight:
          'Частые эпизоды апноэ повышают риск ухудшения в ближайшее время. Стоит пересмотреть дозу кофеина и необходимость усиления респираторной поддержки.',
      },
      {
        feature: 'map',
        label: 'Среднее АД',
        contribution: 9,
        value: '28 мм рт. ст.',
        insight:
          'Низкое для срока гестации среднее АД повышает риск нарушения перфузии. По последним трём измерениям показатель снижается.',
      },
      {
        feature: 'weight',
        label: 'Масса при рождении',
        contribution: 6,
        value: '940 г',
        insight:
          'Очень низкая масса при рождении — постоянный фактор риска, уже учтённый в базовой оценке модели.',
      },
      {
        feature: 'feeding',
        label: 'Переносимость энтерального питания',
        contribution: -5,
        value: 'Усваивает',
        insight:
          'Хорошая переносимость энтерального питания немного снижает риск и указывает на сохранную перфузию кишечника.',
      },
    ],
  },
  {
    id: 'NEO-0388',
    name: 'Ребёнок С. Айгерим',
    bed: 'Блок 1 · инкубатор 4',
    gestationalAgeWeeks: 31,
    birthWeightGrams: 1520,
    dayOfLife: 11,
    status: 'watch',
    riskScore: 46,
    riskDelta: -3,
    lastUpdated: '4 мин назад',
    baselineRisk: 30,
    vitals: {
      heartRate: 158,
      spo2: 94,
      temperature: 36.8,
      respiratoryRate: 48,
      meanBloodPressure: 34,
    },
    vitalHistory: mkHistory({ hr: 156, spo2: 94, temp: 36.7 }),
    shap: [
      {
        feature: 'crp',
        label: 'Динамика СРБ',
        contribution: 11,
        value: '18 мг/л',
        insight:
          'Рост С-реактивного белка настораживает в отношении позднего неонатального сепсиса. Сопоставьте с осмотром и результатами посевов.',
      },
      {
        feature: 'fio2',
        label: 'Потребность в FiO₂',
        contribution: 7,
        value: '0.30',
        insight: 'Небольшая потребность в кислороде умеренно повышает риск.',
      },
      {
        feature: 'hr_variability',
        label: 'Вариабельность ЧСС',
        contribution: 5,
        value: 'Снижена',
        insight:
          'Снижение вариабельности ЧСС может опережать клиническое ухудшение на несколько часов.',
      },
      {
        feature: 'weight_gain',
        label: 'Прибавка массы (7 дн)',
        contribution: -8,
        value: '+120 г',
        insight:
          'Стабильная прибавка массы — защитный фактор, снижающий риск неблагоприятного исхода.',
      },
    ],
  },
  {
    id: 'NEO-0402',
    name: 'Ребёнок Д. Тимур',
    bed: 'Блок 2 · инкубатор 8',
    gestationalAgeWeeks: 34,
    birthWeightGrams: 2180,
    dayOfLife: 3,
    status: 'stable',
    riskScore: 18,
    riskDelta: -2,
    lastUpdated: '1 мин назад',
    baselineRisk: 22,
    vitals: {
      heartRate: 144,
      spo2: 97,
      temperature: 36.9,
      respiratoryRate: 42,
      meanBloodPressure: 41,
    },
    vitalHistory: mkHistory({ hr: 143, spo2: 97, temp: 36.9 }),
    shap: [
      {
        feature: 'ga',
        label: 'Срок гестации',
        contribution: -10,
        value: '34 нед',
        insight:
          'Больший срок гестации — сильный защитный фактор, снижающий базовый риск.',
      },
      {
        feature: 'room_air',
        label: 'Респираторная поддержка',
        contribution: -6,
        value: 'Комнатный воздух',
        insight:
          'Дыхание комнатным воздухом при стабильной сатурации говорит о низком респираторном риске.',
      },
      {
        feature: 'temp_stability',
        label: 'Терморегуляция',
        contribution: 4,
        value: 'Стабильна',
        insight:
          'Терморегуляция стабильна; небольшой вклад отражает нормальную адаптацию новорождённого.',
      },
    ],
  },
  {
    id: 'NEO-0415',
    name: 'Ребёнок М. Жанна',
    bed: 'Блок 3 · инкубатор 10',
    gestationalAgeWeeks: 29,
    birthWeightGrams: 1180,
    dayOfLife: 8,
    status: 'watch',
    riskScore: 58,
    riskDelta: 4,
    lastUpdated: '3 мин назад',
    baselineRisk: 33,
    vitals: {
      heartRate: 165,
      spo2: 92,
      temperature: 37.4,
      respiratoryRate: 55,
      meanBloodPressure: 31,
    },
    vitalHistory: mkHistory({ hr: 162, spo2: 92, temp: 37.2 }),
    shap: [
      {
        feature: 'temp',
        label: 'Нестабильность температуры',
        contribution: 13,
        value: '37.4 °C',
        insight:
          'Нестабильная температура с тенденцией к росту может указывать на раннюю инфекцию. Рекомендуется проверить маркеры сепсиса.',
      },
      {
        feature: 'fio2',
        label: 'Потребность в FiO₂',
        contribution: 10,
        value: '0.40',
        insight:
          'Умеренная потребность в кислороде заметно влияет на текущую оценку риска.',
      },
      {
        feature: 'lactate',
        label: 'Лактат крови',
        contribution: 8,
        value: '3.2 ммоль/л',
        insight:
          'Умеренно повышенный лактат указывает на снижение тканевой перфузии; нужен контроль в динамике.',
      },
      {
        feature: 'feeding',
        label: 'Переносимость кормления',
        contribution: -4,
        value: 'Усваивает',
        insight: 'Сохранная переносимость кормления немного снижает риск.',
      },
    ],
  },
]
