/** Reference solution (BFS). Used by integration tests and as documentation. */
export const mazeGoSolution = `package main

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
}

func main() {
	env := codinlab.Connect()
	var obs Observation
	if err := env.Observe(&obs); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	moves := []struct {
		name   string
		dx, dy int
	}{{"UP", 0, -1}, {"DOWN", 0, 1}, {"LEFT", -1, 0}, {"RIGHT", 1, 0}}

	type prev struct {
		from Point
		move string
	}
	came := map[Point]prev{obs.Position: {}}
	queue := []Point{obs.Position}
	for len(queue) > 0 && came[obs.Goal] == (prev{}) {
		cur := queue[0]
		queue = queue[1:]
		for _, m := range moves {
			next := Point{cur.X + m.dx, cur.Y + m.dy}
			if obs.Grid[next.Y][next.X] == '#' {
				continue
			}
			if _, seen := came[next]; seen {
				continue
			}
			came[next] = prev{cur, m.name}
			queue = append(queue, next)
		}
	}

	var path []string
	for p := obs.Goal; p != obs.Position; p = came[p].from {
		path = append([]string{came[p].move}, path...)
	}
	for _, move := range path {
		if _, err := env.Act(map[string]string{"move": move}); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	}
	env.Logf("Followed %d moves", len(path))
}
`;
