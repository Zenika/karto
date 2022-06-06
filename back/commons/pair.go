package commons

type Pair[T1, T2 any] struct {
	Left  T1
	Right T2
}

func AllPairs[T1 any](slice []T1) []Pair[T1, T1] {
	result := make([]Pair[T1, T1], 0, len(slice)*(len(slice)-1))
	for i, value1 := range slice {
		for j, value2 := range slice {
			if i == j {
				continue
			}
			result = append(result, Pair[T1, T1]{
				Left:  value1,
				Right: value2,
			})
		}
	}
	return result
}
