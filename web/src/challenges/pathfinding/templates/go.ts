export const pathfindingGoTemplate = `package main

import (
	"fmt"
	"os"

	"usercode/codinlab"
)

type Cell struct {
	X int \`json:"x"\`
	Y int \`json:"y"\`
}

type Observation struct {
	Grid  []string \`json:"grid"\`
	Start Cell     \`json:"start"\`
	End   Cell     \`json:"end"\`
}

type action struct {
	Type  string \`json:"type"\`
	Cell  *Cell  \`json:"cell,omitempty"\`
	Cells []Cell \`json:"cells,omitempty"\`
}

func must[T any](value T, err error) T {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	return value
}

func visit(env *codinlab.Env, c Cell) {
	must(env.Act(action{Type: "visit", Cell: &c}))
}

func explore(env *codinlab.Env, c Cell) {
	must(env.Act(action{Type: "explore", Cell: &c}))
}

func main() {
	env := codinlab.Connect()
	var obs Observation
	must(0, env.Observe(&obs))
	env.Logf("Find a path from %v to %v", obs.Start, obs.End)

	// TODO: run a BFS from obs.Start. For every cell you dequeue call visit(),
	// and call explore() for each free neighbor you discover. When you reach
	// obs.End, rebuild the path and send it with set_path, then finish.
	visit(env, obs.Start)
	explore(env, Cell{obs.Start.X + 1, obs.Start.Y})

	path := []Cell{obs.Start} // incomplete on purpose
	must(env.Act(action{Type: "set_path", Cells: path}))
	must(env.Act(action{Type: "finish"}))
}
`;
