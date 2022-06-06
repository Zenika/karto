package commons

type Set[T1 comparable] struct {
	internal map[T1]bool
}

func (set *Set[T1]) Add(value T1) {
	set.internal[value] = true
}

func (set *Set[T1]) Contains(value T1) bool {
	return set.internal[value]
}

func (set *Set[T1]) ToSlice() []T1 {
	result := make([]T1, 0, len(set.internal))
	for value := range set.internal {
		result = append(result, value)
	}
	return result
}

func NewSet[T1 comparable]() *Set[T1] {
	return &Set[T1]{
		internal: map[T1]bool{},
	}
}
