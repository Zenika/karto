package statefulset

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		statefulSet *appsv1.StatefulSet
		pods        []*corev1.Pod
	}
	tests := []struct {
		name                              string
		args                              args
		expectedStatefulSetWithTargetPods *types.StatefulSet
	}{
		{
			name: "statefulSet name and namespace are propagated",
			args: args{
				statefulSet: testutils.NewStatefulSetBuilder().WithName("rs").WithNamespace("ns").Build(),
				pods:        []*corev1.Pod{},
			},
			expectedStatefulSetWithTargetPods: &types.StatefulSet{
				Name:       "rs",
				Namespace:  "ns",
				TargetPods: []types.PodRef{},
			},
		},
		{
			name: "only pods referencing statefulSet as owner are detected as target",
			args: args{
				statefulSet: testutils.NewStatefulSetBuilder().WithUID("statefulset-uid").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithOwnerUID("statefulset-uid").Build(),
					testutils.NewPodBuilder().WithName("name2").WithOwnerUID("other-uid").Build(),
				},
			},
			expectedStatefulSetWithTargetPods: &types.StatefulSet{
				Namespace: "default",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
		{
			name: "statefulSets with 0 desired replicas are ignored",
			args: args{
				statefulSet: testutils.NewStatefulSetBuilder().WithDesiredReplicas(0).Build(),
				pods:        []*corev1.Pod{},
			},
			expectedStatefulSetWithTargetPods: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			statefulSetWithTargetPods := analyzer.Analyze(tt.args.statefulSet, tt.args.pods)
			if diff := cmp.Diff(tt.expectedStatefulSetWithTargetPods, statefulSetWithTargetPods); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
