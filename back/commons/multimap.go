package commons

type MapEntry[T1 comparable, T2 any] struct {
	Key   T1
	Value T2
}

type MultiMap[T1 comparable, T2 any] struct {
	internal map[T1][]T2
}

func (multiMap *MultiMap[T1, T2]) AddMapping(key T1, value T2) {
	values := multiMap.internal[key]
	if values == nil {
		values = []T2{}
	}
	values = append(values, value)
	multiMap.internal[key] = values
}

func (multiMap *MultiMap[T1, T2]) AddKey(key T1) {
	values := multiMap.internal[key]
	if values == nil {
		values = []T2{}
	}
	multiMap.internal[key] = values
}

func (multiMap *MultiMap[T1, T2]) Entries() []MapEntry[T1, []T2] {
	result := make([]MapEntry[T1, []T2], 0, len(multiMap.internal))
	for key, values := range multiMap.internal {
		result = append(result, MapEntry[T1, []T2]{
			Key:   key,
			Value: values,
		})
	}
	return result
}

func NewMultiMap[T1 comparable, T2 any]() *MultiMap[T1, T2] {
	return &MultiMap[T1, T2]{
		internal: map[T1][]T2{},
	}
}
