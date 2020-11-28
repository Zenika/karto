package api

import (
	"github.com/google/go-cmp/cmp"
	"io/ioutil"
	"karto/types"
	"net"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"
)

func Test_Expose(t *testing.T) {
	type args struct {
		endPoint       string
		analysisResult types.AnalysisResult
	}
	pod1 := &types.Pod{Name: "pod1", Namespace: "ns", Labels: map[string]string{"k1": "v1"}}
	pod2 := &types.Pod{Name: "pod2", Namespace: "ns", Labels: map[string]string{"k2": "v2"}}
	podRef1 := types.PodRef{Name: pod1.Name, Namespace: pod1.Namespace}
	podRef2 := types.PodRef{Name: pod2.Name, Namespace: pod2.Namespace}
	podIsolation1 := &types.PodIsolation{Pod: podRef1, IsIngressIsolated: false, IsEgressIsolated: true}
	podIsolation2 := &types.PodIsolation{Pod: podRef2, IsIngressIsolated: true, IsEgressIsolated: false}
	networkPolicy1 := types.NetworkPolicy{Name: "eg", Namespace: "ns", Labels: map[string]string{"k3": "v3"}}
	networkPolicy2 := types.NetworkPolicy{Name: "in", Namespace: "ns", Labels: map[string]string{"k4": "v4"}}
	allowedRoute := &types.AllowedRoute{SourcePod: podRef1, EgressPolicies: []types.NetworkPolicy{networkPolicy1},
		TargetPod: podRef2, IngressPolicies: []types.NetworkPolicy{networkPolicy2}, Ports: []int32{80, 443}}
	service1 := &types.Service{Name: "svc1", Namespace: "ns", TargetPods: []types.PodRef{podRef1}}
	service2 := &types.Service{Name: "svc2", Namespace: "ns", TargetPods: []types.PodRef{podRef2}}
	serviceRef1 := types.ServiceRef{Name: "svc1", Namespace: "ns"}
	serviceRef2 := types.ServiceRef{Name: "svc2", Namespace: "ns"}
	ingress1 := &types.Ingress{Name: "ing1", Namespace: "ns",
		TargetServices: []types.ServiceRef{serviceRef1}}
	ingress2 := &types.Ingress{Name: "ing2", Namespace: "ns",
		TargetServices: []types.ServiceRef{serviceRef2}}
	replicaSet1 := &types.ReplicaSet{Name: "rs1", Namespace: "ns", TargetPods: []types.PodRef{podRef1}}
	replicaSet2 := &types.ReplicaSet{Name: "rs2", Namespace: "ns", TargetPods: []types.PodRef{podRef2}}
	statefulSet1 := &types.StatefulSet{Name: "ss1", Namespace: "ns", TargetPods: []types.PodRef{podRef1}}
	statefulSet2 := &types.StatefulSet{Name: "ss2", Namespace: "ns", TargetPods: []types.PodRef{podRef2}}
	daemonSet1 := &types.DaemonSet{Name: "ds1", Namespace: "ns", TargetPods: []types.PodRef{podRef1}}
	daemonSet2 := &types.DaemonSet{Name: "ds2", Namespace: "ns", TargetPods: []types.PodRef{podRef2}}
	replicaSetRef1 := types.ReplicaSetRef{Name: replicaSet1.Name, Namespace: replicaSet1.Namespace}
	replicaSetRef2 := types.ReplicaSetRef{Name: replicaSet2.Name, Namespace: replicaSet2.Namespace}
	deployment1 := &types.Deployment{Name: "deploy1", Namespace: "ns",
		TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef1}}
	deployment2 := &types.Deployment{Name: "deploy2", Namespace: "ns",
		TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef2}}
	tests := []struct {
		name         string
		args         args
		expectedBody string
	}{
		{
			name: "exposes health status",
			args: args{
				endPoint:       "/health",
				analysisResult: types.AnalysisResult{},
			},
			expectedBody: "OK\n",
		},
		{
			name: "exposes the last published analysis result",
			args: args{
				endPoint: "/api/analysisResult",
				analysisResult: types.AnalysisResult{
					Pods:          []*types.Pod{pod1, pod2},
					PodIsolations: []*types.PodIsolation{podIsolation1, podIsolation2},
					AllowedRoutes: []*types.AllowedRoute{allowedRoute},
					Services:      []*types.Service{service1, service2},
					Ingresses:     []*types.Ingress{ingress1, ingress2},
					ReplicaSets:   []*types.ReplicaSet{replicaSet1, replicaSet2},
					StatefulSets:  []*types.StatefulSet{statefulSet1, statefulSet2},
					DaemonSets:    []*types.DaemonSet{daemonSet1, daemonSet2},
					Deployments:   []*types.Deployment{deployment1, deployment2},
				},
			},
			expectedBody: "{" +
				"\"pods\":[" +
				"    {\"name\":\"pod1\",\"namespace\":\"ns\",\"labels\":{\"k1\":\"v1\"}}," +
				"    {\"name\":\"pod2\",\"namespace\":\"ns\",\"labels\":{\"k2\":\"v2\"}}" +
				"]," +
				"\"podIsolations\":[" +
				"    {" +
				"        \"pod\":{\"name\":\"pod1\",\"namespace\":\"ns\"}," +
				"        \"isIngressIsolated\":false," +
				"        \"isEgressIsolated\":true" +
				"    }," +
				"    {" +
				"        \"pod\":{\"name\":\"pod2\",\"namespace\":\"ns\"}," +
				"        \"isIngressIsolated\":true," +
				"        \"isEgressIsolated\":false" +
				"    }" +
				"]," +
				"\"allowedRoutes\":[" +
				"    {" +
				"\"sourcePod\":{\"name\":\"pod1\",\"namespace\":\"ns\"}," +
				"\"egressPolicies\":[{\"name\":\"eg\",\"namespace\":\"ns\",\"labels\":{\"k3\":\"v3\"}}]," +
				"\"targetPod\":{\"name\":\"pod2\",\"namespace\":\"ns\"}," +
				"\"ingressPolicies\":[{\"name\":\"in\",\"namespace\":\"ns\",\"labels\":{\"k4\":\"v4\"}}]," +
				"\"ports\":[80,443]" +
				"    }" +
				"]," +
				"\"services\":[" +
				"    {" +
				"        \"name\":\"svc1\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod1\",\"namespace\":\"ns\"}]" +
				"    }," +
				"    {" +
				"        \"name\":\"svc2\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod2\",\"namespace\":\"ns\"}]" +
				"    }" +
				"]," +
				"\"ingresses\":[" +
				"    {" +
				"        \"name\":\"ing1\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetServices\":[{\"name\":\"svc1\",\"namespace\":\"ns\"}]" +
				"    }," +
				"    {" +
				"        \"name\":\"ing2\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetServices\":[{\"name\":\"svc2\",\"namespace\":\"ns\"}]" +
				"    }" +
				"]," +
				"\"replicaSets\":[" +
				"    {" +
				"        \"name\":\"rs1\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod1\",\"namespace\":\"ns\"}]" +
				"    }," +
				"    {" +
				"        \"name\":\"rs2\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod2\",\"namespace\":\"ns\"}]" +
				"    }" +
				"]," +
				"\"statefulSets\":[" +
				"    {" +
				"        \"name\":\"ss1\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod1\",\"namespace\":\"ns\"}]" +
				"    }," +
				"    {" +
				"        \"name\":\"ss2\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod2\",\"namespace\":\"ns\"}]" +
				"    }" +
				"]," +
				"\"daemonSets\":[" +
				"    {" +
				"        \"name\":\"ds1\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod1\",\"namespace\":\"ns\"}]" +
				"    }," +
				"    {" +
				"        \"name\":\"ds2\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetPods\":[{\"name\":\"pod2\",\"namespace\":\"ns\"}]" +
				"    }" +
				"]," +
				"\"deployments\":[" +
				"    {" +
				"        \"name\":\"deploy1\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetReplicaSets\":[{\"name\":\"rs1\",\"namespace\":\"ns\"}]" +
				"    }," +
				"    {" +
				"        \"name\":\"deploy2\"," +
				"        \"namespace\":\"ns\"," +
				"        \"targetReplicaSets\":[{\"name\":\"rs2\",\"namespace\":\"ns\"}]" +
				"    }" +
				"]" +
				"}\n",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			address := "localhost:" + strconv.Itoa(findAvailablePort())
			resultsChannel := make(chan types.AnalysisResult)
			go Expose(address, resultsChannel)
			resultsChannel <- tt.args.analysisResult
			time.Sleep(10 * time.Millisecond)
			response, _ := http.Get("http://" + address + tt.args.endPoint)
			defer response.Body.Close()
			body, _ := ioutil.ReadAll(response.Body)
			bodyStr := string(body)
			expectedBodyStr := strings.Replace(tt.expectedBody, " ", "", -1)
			if diff := cmp.Diff(200, response.StatusCode); diff != "" {
				t.Errorf("Response status code mismatch (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(expectedBodyStr, bodyStr); diff != "" {
				t.Errorf("Response body mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func findAvailablePort() int {
	address, _ := net.ResolveTCPAddr("tcp", "localhost:0")
	listener, _ := net.ListenTCP("tcp", address)
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port
}
