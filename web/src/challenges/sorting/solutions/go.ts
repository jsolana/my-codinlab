/** Reference solution (insertion sort). */
export const sortingGoSolution = `package main

import (
	"fmt"
	"os"

	"usercode/codinlab"
)

type action struct {
	Type string \`json:"type"\`
	I    int    \`json:"i"\`
	J    int    \`json:"j"\`
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
		Length int \`json:"length"\`
	}
	must(0, env.Observe(&obs))

	for i := 1; i < obs.Length; i++ {
		for j := i; j > 0; j-- {
			step := must(env.Act(action{Type: "compare", I: j - 1, J: j}))
			var info struct {
				Result int \`json:"result"\`
			}
			must(0, step.DecodeInfo(&info))
			if info.Result <= 0 {
				break
			}
			must(env.Act(action{Type: "swap", I: j - 1, J: j}))
		}
	}
	must(env.Act(action{Type: "finish"}))
}
`;
