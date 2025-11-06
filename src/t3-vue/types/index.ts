export interface Model {
  id: number;
  name: string;
  description: string;
  image: string;
  avatar: string;
  author: string;
  category: string;
  task?: string;
  tags?: string[];
  stars?: number;
  forks?: number;
}

export interface Studio {
  id: number;
  name: string;
  description: string;
  image: string;
  avatar: string;
  author: string;
  category?: string;
  tags?: string[];
  views?: string;
  likes?: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string;
  image: string;
  count: number;
}