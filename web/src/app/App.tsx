import { getChallenge } from '@/core/challenges/registry';
import { ChallengeExplorer } from './pages/ChallengeExplorer/ChallengeExplorer';
import { ChallengePlayground } from './pages/ChallengePlayground/ChallengePlayground';
import { ChallengePreview } from './pages/ChallengePreview/ChallengePreview';
import { NotFound } from './pages/NotFound';
import { useRoute } from './routing/router';

export function App() {
  const route = useRoute();

  switch (route.name) {
    case 'explorer':
      return <ChallengeExplorer />;
    case 'preview':
    case 'playground': {
      const challenge = getChallenge(route.id);
      if (!challenge) return <NotFound />;
      return route.name === 'preview' ? (
        <ChallengePreview challenge={challenge} />
      ) : (
        <ChallengePlayground key={challenge.id} challenge={challenge} />
      );
    }
    default:
      return <NotFound />;
  }
}
