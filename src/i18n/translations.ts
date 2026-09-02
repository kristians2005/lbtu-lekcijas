import type { Language, LessonType, StudyMode } from '../domain/models.ts'

const en = {
  appName: 'LBTU Lekcijas', unofficial: 'Independent timetable', programme: 'Study programme',
  findProgramme: 'Find your study programme', searchProgramme: 'Search by name or code',
  chooseProgrammeOptions: 'Choose timetable options', chooseProgrammeOptionsHelp: 'Select your academic period, study mode, semester, and group.',
  allFaculties: 'All faculties', noProgrammes: 'No programmes match this search.',
  available: 'Schedule available', unavailable: 'Snapshot not generated', period: 'Academic period',
  studyMode: 'Study mode', semester: 'Semester', group: 'Group', allGroups: 'All groups',
  fullTime: 'Full-time', partTime: 'Part-time', continue: 'Open schedule', changeProgramme: 'Change programme',
  myCourses: 'My courses', allCourses: 'All courses are shown initially.', selectAll: 'Select all',
  clear: 'Clear', apply: 'Apply', newCourse: 'New', today: 'Today', previousWeek: 'Previous week',
  nextWeek: 'Next week', agenda: 'Agenda', week: 'Week', settings: 'Settings', language: 'Language',
  theme: 'Theme', refresh: 'Refresh', refreshing: 'Refreshing', updated: 'Schedule data updated',
  chooseTheme: 'Pick your favorite theme', chooseThemeHelp: 'Try a few themes and choose the one that feels right. You can change it later from the theme button in the navigation bar.', applyTheme: 'Apply theme',
  loaded: 'Loaded in this browser', source: 'Official LBTU source', accuracyTitle: 'Schedule accuracy', sourceLimit: 'LBTU schedules can change. Cancelled or rescheduled classes may not always be represented correctly here, so check the official timetable when accuracy is important.',
  noClasses: 'No classes on this day.', filteredEmpty: 'Your course filter hides all classes on this day.',
  noCoursesSelected: 'No courses selected', jumpToClasses: 'Jump to first available class',
  nextClass: 'Next class', datesChecking: 'Dates need checking', datesCheckingHelp: 'These source entries have incomplete or unverified date rules. Check them at LBTU.',
  loadingCatalogue: 'Loading study programmes', loadingSchedule: 'Loading timetable', retry: 'Retry',
  loadFailed: 'The deployed timetable file could not be loaded.', catalogueFailed: 'The deployed programme catalogue could not be loaded.',
  unavailableHelp: 'This selection has no generated static snapshot yet. Run the data update and redeploy, or use the official timetable.',
  staleKept: 'Refresh failed. The previously loaded schedule is still shown.', emptyPublished: 'LBTU published an empty timetable for this selection.',
  details: 'Class details', date: 'Date', time: 'Time', lessonType: 'Class type', teacher: 'Lecturer',
  location: 'Location', notes: 'Source notes', close: 'Close', openSource: 'Open LBTU timetable',
  reset: 'Reset saved preferences', resetConfirm: 'Reset programme, courses, language, theme, and view preferences?',
  cancel: 'Cancel', confirmReset: 'Reset', storageUnavailable: 'Preferences cannot be saved in this browser, but the app still works for this visit.',
  restoredInvalid: 'A saved timetable choice is no longer available. Choose the missing option again.',
  coursesCount: (selected: number, total: number) => `${selected} of ${total} selected`,
  semesterValue: (value: number) => `Semester ${value}`,
  groupValue: (value: string) => value === 'Visas grupas' ? 'All groups' : value,
}

const lv: typeof en = {
  appName: 'LBTU Lekcijas', unofficial: 'Neatkarīgs lekciju saraksts', programme: 'Studiju programma',
  findProgramme: 'Atrodi savu studiju programmu', searchProgramme: 'Meklē pēc nosaukuma vai koda',
  chooseProgrammeOptions: 'Izvēlies saraksta parametrus', chooseProgrammeOptionsHelp: 'Izvēlies akadēmisko periodu, studiju formu, semestri un grupu.',
  allFaculties: 'Visas fakultātes', noProgrammes: 'Neviena programma neatbilst meklējumam.',
  available: 'Saraksts pieejams', unavailable: 'Datu kopija nav izveidota', period: 'Akadēmiskais periods',
  studyMode: 'Studiju forma', semester: 'Semestris', group: 'Grupa', allGroups: 'Visas grupas',
  fullTime: 'Pilna laika', partTime: 'Nepilna laika', continue: 'Atvērt sarakstu', changeProgramme: 'Mainīt programmu',
  myCourses: 'Mani kursi', allCourses: 'Sākumā tiek rādīti visi kursi.', selectAll: 'Atzīmēt visus',
  clear: 'Notīrīt', apply: 'Lietot', newCourse: 'Jauns', today: 'Šodien', previousWeek: 'Iepriekšējā nedēļa',
  nextWeek: 'Nākamā nedēļa', agenda: 'Diena', week: 'Nedēļa', settings: 'Iestatījumi', language: 'Valoda',
  theme: 'Stils', refresh: 'Atjaunot', refreshing: 'Atjauno', updated: 'Saraksta dati atjaunoti',
  chooseTheme: 'Izvēlies savu iecienītāko stilu', chooseThemeHelp: 'Izmēģini vairākus stilus un izvēlies piemērotāko. Vēlāk to varēsi mainīt navigācijas joslā.', applyTheme: 'Lietot stilu',
  loaded: 'Ielādēts šajā pārlūkā', source: 'Oficiālais LBTU avots', accuracyTitle: 'Saraksta precizitāte', sourceLimit: 'LBTU lekciju saraksts var mainīties. Atceltās vai pārceltās nodarbības šeit ne vienmēr var būt attēlotas pareizi, tāpēc svarīgos gadījumos pārbaudi oficiālo sarakstu.',
  noClasses: 'Šajā dienā nodarbību nav.', filteredEmpty: 'Kursu filtrs paslēpj visas šīs dienas nodarbības.',
  noCoursesSelected: 'Nav izvēlēts neviens kurss', jumpToClasses: 'Pāriet uz pirmo pieejamo nodarbību',
  nextClass: 'Nākamā nodarbība', datesChecking: 'Datumi jāpārbauda', datesCheckingHelp: 'Šiem avota ierakstiem datumu noteikumi ir nepilnīgi vai nepārbaudīti. Pārbaudi tos LBTU vietnē.',
  loadingCatalogue: 'Ielādē studiju programmas', loadingSchedule: 'Ielādē lekciju sarakstu', retry: 'Mēģināt vēlreiz',
  loadFailed: 'Neizdevās ielādēt publicēto lekciju saraksta failu.', catalogueFailed: 'Neizdevās ielādēt publicēto programmu katalogu.',
  unavailableHelp: 'Šai izvēlei vēl nav izveidota statiska datu kopija. Atjauno datus un publicē vietni vēlreiz vai izmanto oficiālo sarakstu.',
  staleKept: 'Atjaunošana neizdevās. Iepriekš ielādētais saraksts joprojām ir redzams.', emptyPublished: 'LBTU šai izvēlei publicējis tukšu lekciju sarakstu.',
  details: 'Nodarbības informācija', date: 'Datums', time: 'Laiks', lessonType: 'Nodarbības veids', teacher: 'Pasniedzējs',
  location: 'Vieta', notes: 'Avota piezīmes', close: 'Aizvērt', openSource: 'Atvērt LBTU sarakstu',
  reset: 'Notīrīt saglabātos iestatījumus', resetConfirm: 'Notīrīt programmas, kursu, valodas, stila un skata izvēles?',
  cancel: 'Atcelt', confirmReset: 'Notīrīt', storageUnavailable: 'Šajā pārlūkā izvēles nevar saglabāt, bet lietotne šajā apmeklējumā darbojas.',
  restoredInvalid: 'Saglabātā saraksta izvēle vairs nav pieejama. Izvēlies trūkstošo variantu vēlreiz.',
  coursesCount: (selected: number, total: number) => `Izvēlēti ${selected} no ${total}`,
  semesterValue: (value: number) => `${value}. semestris`,
  groupValue: (value: string) => value,
}

export type Translations = typeof en
export const translations: Record<Language, Translations> = { en, lv }

export function lessonTypeLabel(type: LessonType, language: Language, fallback: string): string {
  const values: Record<LessonType, [string, string]> = {
    lecture: ['Lekcija', 'Lecture'], practical: ['Prakt. darbi', 'Practical class'], lab: ['Lab. darbi', 'Lab'],
    seminar: ['Seminārs', 'Seminar'], assessment: ['Pārbaudījums', 'Assessment'],
    consultation: ['Konsultācija', 'Consultation'], unknown: [fallback, fallback],
  }
  return values[type][language === 'lv' ? 0 : 1]
}

export function studyModeLabel(mode: StudyMode, t: Translations): string {
  return mode === 'full-time' ? t.fullTime : t.partTime
}
