export const mazeGoTemplate = `package main

import (
	"fmt"
	"os"

	"usercode/codinlab"
)

type Point struct {
	X int \`json:"x"\`
	Y int \`json:"y"\`
}

type Observation struct {
	Grid     []string \`json:"grid"\`
	Position Point    \`json:"position"\`
	Goal     Point    \`json:"goal"\`
	Steps    int      \`json:"steps"\`
}

func main() {
	env := codinlab.Connect()

	var obs Observation
	if err := env.Observe(&obs); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	env.Logf("Start %v, goal %v, grid %dx%d", obs.Position, obs.Goal, len(obs.Grid[0]), len(obs.Grid))

	// TODO: find a path from obs.Position to obs.Goal (hint: BFS on obs.Grid)
	// and send one move per step. This placeholder just walks right.
	for i := 0; i < 3; i++ {
		step, err := env.Act(map[string]string{"move": "RIGHT"})
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		if step.Done {
			return
		}
	}
}
`;
