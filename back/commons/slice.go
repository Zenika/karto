package commons

func Filter[T1 any](slice []T1, predicate func(T1) bool) []T1 {
	result := make([]T1, 0)
	for _, value := range slice {
		if predicate(value) {
			result = append(result, value)
		}
	}
	return result
}

func Map[T1, T2 any](slice []T1, mapper func(T1) T2) []T2 {
	result := make([]T2, 0, len(slice))
	for _, v := range slice {
		result = append(result, mapper(v))
	}
	return result
}

func MapAndKeepNotNil[T1, T2 any](slice []T1, mapper func(T1) *T2) []*T2 {
	result := make([]*T2, 0, len(slice))
	for _, v := range slice {
		mapped := mapper(v)
		if mapped != nil {
			result = append(result, mapped)
		}
	}
	return result
}

func AnyMatch[T1 any](slice []T1, predicate func(T1) bool) bool {
	for _, value := range slice {
		if predicate(value) {
			return true
		}
	}
	return false
}
