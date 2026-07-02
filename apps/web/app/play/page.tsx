import type { Metadata } from 'next';
import GameRoot from '../../game/GameRoot';

export const metadata: Metadata = {
  title: 'WARCHEST — Play',
};

export default function PlayPage(): JSX.Element {
  return <GameRoot />;
}
