/* global 
  highlightStudiedTech
*/

const EXAMPLE = {
  Biology: {
    tech: [
        'Экзобиология',
        'Секвенирование ДНК',
        'Инопланетное сельское хозяйство',
        'Выращивание биополимеров',
      ],
      proj: [
        'Оценка внешней среды',
        'Генная терапия',
      ],
  }
}

// eslint-disable-next-line no-unused-vars
const TEST = {
  highlightStudiedTech() {
    highlightStudiedTech('Biology', EXAMPLE.Biology.tech, EXAMPLE.Biology.proj)
  },
}