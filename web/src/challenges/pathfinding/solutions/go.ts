/** Reference solution (BFS with explicit explore/visit). */
export const pathfindingGoSolution = `package main

import (
	"fmt"
	"os"

	"usercode/codinlab"
)

type Cell struct {
	X int \`json:"x"\`
	Y int \`json:"y"\`
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

func main() {
	env := codinlab.Connect()
	var obs struct {
		Grid  []string \`json:"grid"\`
		Start Cell     \`json:"start"\`
		End   Cell     \`json:"end"\`
	}
	must(0, env.Observe(&obs))

	parent := map[Cell]Cell{}
	seen := map[Cell]bool{obs.Start: true}
	queue := []Cell{obs.Start}
	deltas := []Cell{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		must(env.Act(action{Type: "visit", Cell: &cur}))
		if cur == obs.End {
			break
		}
		for _, d := range deltas {
			next := Cell{cur.X + d.X, cur.Y + d.Y}
			if next.Y < 0 || next.Y >= len(obs.Grid) || next.X < 0 || next.X >= len(obs.Grid[0]) {
				continue
			}
			if obs.Grid[next.Y][next.X] == '#' || seen[next] {
				continue
			}
			seen[next] = true
			parent[next] = cur
			must(env.Act(action{Type: "explore", Cell: &next}))
			queue = append(queue, next)
		}
	}

	var path []Cell
	for c := obs.End; c != obs.Start; c = parent[c] {
		path = append([]Cell{c}, path...)
	}
	path = append([]Cell{obs.Start}, path...)
	must(env.Act(action{Type: "set_path", Cells: path}))
	must(env.Act(action{Type: "finish"}))
}
`;
