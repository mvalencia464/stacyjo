export type Product = 'ebook' | 'bundle';

export interface DownloadFile {
  id: string;
  key: string;
  name: string;
  type: string;
  products: Product[];
}

const audio = (n: string, title: string): DownloadFile => ({
  id: n,
  key: `audio/${n} - ${title}.mp3`,
  name: `${n} - ${title}.mp3`,
  type: 'audio/mpeg',
  products: ['bundle'],
});

export const files: DownloadFile[] = [
  {
    id: 'pdf',
    key: 'ebook/The-Leash-Goes-Both-Ways.pdf',
    name: 'The Leash Goes Both Ways.pdf',
    type: 'application/pdf',
    products: ['ebook', 'bundle'],
  },
  audio('01', 'Opening Credits'),
  audio('02', 'Introduction - The Walk You Dread'),
  audio('03', 'Chapter One - The Two-Way Loop'),
  audio('04', 'Chapter Two - The Secure Base'),
  audio('05', 'Chapter Three - The ABCs'),
  audio('06', 'Chapter Four - Calm Is Contagious'),
  audio('07', 'Chapter Five - Over the Edge'),
  audio('08', 'Chapter Six - The Art of the Settle'),
  audio('09', 'Chapter Seven - Speaking Dog'),
  audio('10', 'Chapter Eight - Looking Inward'),
  audio('11', 'Chapter Nine - Consent-Based Living'),
  audio('12', 'Chapter Ten - Play, Handling, and Rebuilding Trust'),
  audio('13', 'Chapter Eleven - The Sniffari'),
  audio('14', 'Chapter Twelve - Leash Harmony'),
  audio('15', 'Chapter Thirteen - Fueling the Brain'),
  audio('16', 'Chapter Fourteen - From Scarcity to Abundance'),
  audio('17', 'Chapter Fifteen - The TRIP Framework'),
  audio('18', 'Chapter Sixteen - Real-World Manners'),
  audio('19', 'Chapter Seventeen - The Long Road Together'),
  audio('20', 'Conclusion - Same Side'),
  audio('21', 'Bonus - The 7-Day Calm Together Plan'),
  audio('22', 'Closing Credits'),
];

export function filesFor(product: Product): DownloadFile[] {
  return files.filter((file) => file.products.includes(product));
}

export function fileById(id: string): DownloadFile | undefined {
  return files.find((file) => file.id === id);
}
