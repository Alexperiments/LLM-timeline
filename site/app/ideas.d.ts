declare module 'virtual:ideas' {
  export interface IdeaDate { value: number; precision: 'year' | 'month' | 'day'; text: string }
  export interface Idea { id: string; title: string; track: string; category: string; start: IdeaDate; end: IdeaDate | null; body: string }
  const ideas: Idea[];
  export default ideas;
}
